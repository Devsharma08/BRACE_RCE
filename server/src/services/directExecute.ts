import { spawn } from "child_process";
import { writeFileSync, mkdtempSync, chmodSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  error?: string;
}

interface LangSpec {
  ext: string;
  compileCmd?: string[];
  runCmd: string[];
}

const LANG_SPECS: Record<string, LangSpec> = {
  javascript: { ext: ".js", runCmd: ["node", "Main.js"] },
  python: { ext: ".py", runCmd: ["python3", "Main.py"] },
  java: {
    ext: ".java",
    compileCmd: ["javac", "-J-Xmx256m", "-J-XX:TieredStopAtLevel=1"],
    runCmd: [
      "java", "-Xshare:auto", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1",
      "-XX:CICompilerCount=1", "-XX:-UsePerfData", "-Xmx128m", "-Xss16m", "Main",
    ],
  },
  cpp: {
    ext: ".cpp",
    compileCmd: ["g++", "-O1", "-pipe", "-fno-use-linker-plugin", "-o", "a.out"],
    runCmd: ["./a.out"],
  },
  c: {
    ext: ".c",
    compileCmd: ["gcc", "-O1", "-pipe", "-fno-use-linker-plugin", "-o", "a.out"],
    runCmd: ["./a.out"],
  },
};

const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_FSIZE_BYTES = 32 * 1024 * 1024; // 32 MB

const BRACE_RUNNER_IMAGE = "brace-runner:latest";

// Per-language memory limits in MB. Docker --memory covers the whole container
// including tmpfs filesystems, so these must exceed the runtime heap.
const MEMORY_LIMITS_MB: Record<string, { compile: number; run: number }> = {
  javascript: { compile: 256, run: 256 },
  python: { compile: 256, run: 256 },
  java: { compile: 768, run: 512 },
  cpp: { compile: 512, run: 256 },
  c: { compile: 256, run: 256 },
};

// Tmpfs sizes in MB. Count against --memory limit.
const TMPFS_WORK_MB = 32;
const TMPFS_TMP_RUN_MB = 32;
const TMPFS_TMP_COMPILE_MB = 64;

let sandboxCache: boolean | null = null;
let sandboxCachePromise: Promise<boolean> | null = null;

/**
 * Boot-time self-check: run a trivial program inside the real sandbox command
 * and verify every isolation probe reads BLOCKED. If any probe fails, the
 * sandbox is unavailable and production must fail closed.
 */
export async function sandboxAvailable(): Promise<boolean> {
  if (sandboxCache !== null) return sandboxCache;
  if (sandboxCachePromise) return sandboxCachePromise;

  sandboxCachePromise = (async () => {
    try {
      // 1. Docker daemon reachable?
      await runProbe("docker", ["version", "--format", "{{.Server.Version}}"], 10000);

      // 2. Can we run a container with full isolation? Use the same shape as
      //    runDockerCommand: --tmpfs /work:exec, read-only source mount.
      const workDir = mkdtempSync(join(tmpdir(), "brace-probe-"));
      chmodSync(workDir, 0o700);
      try {
        await runDockerProbe(workDir);
        sandboxCache = true;
      } finally {
        try { rmSync(workDir, { recursive: true, force: true }); } catch {}
      }
      return true;
    } catch (e) {
      sandboxCache = false;
      return false;
    }
  })();

  return sandboxCachePromise;
}

function runProbe(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], timeout: timeoutMs });
    let out = "";
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}`));
    });
    p.on("error", reject);
    setTimeout(() => { p.kill("SIGKILL"); reject(new Error("timeout")); }, timeoutMs);
  });
}

async function runDockerProbe(workDir: string): Promise<void> {
  const { execSync } = await import('child_process');
  const probeCode = `#!/bin/sh
id
(test -r /app && echo APP_READABLE || echo APP_BLOCKED)
(test -r /app/.env && echo ENV_READABLE || echo ENV_BLOCKED)
(test -r /proc/1/environ && echo PROC_READABLE || echo PROC_BLOCKED)
(test -w /outside && echo OUTSIDE_WRITABLE || echo OUTSIDE_BLOCKED)
(env | grep -E 'DATABASE_URL|JWT_SECRET|REDIS_URL|SECRET' && echo SECRET_LEAK || echo SECRET_BLOCKED)
(bash -c '(exec 3<>/dev/tcp/127.0.0.1/6379) 2>/dev/null && echo NET_REDIS || echo NET_REDIS_BLOCKED')
(bash -c '(exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null && echo NET_POSTGRES || echo NET_POSTGRES_BLOCKED')
(bash -c '(exec 3<>/dev/tcp/169.254.169.254/80) 2>/dev/null && echo NET_METADATA || echo NET_METADATA_BLOCKED')
`;
  const probeFile = join(workDir, "probe.sh");
  writeFileSync(probeFile, probeCode, "utf8");

  const containerName = "brace-probe-" + Date.now();
  try {
    execSync(
      'docker run --rm --network none --memory 256m --memory-swap 256m ' +
        '--pids-limit 16 --cpus 1 --read-only ' +
        '--tmpfs /work:exec,size=32m --tmpfs /tmp:size=16m,exec ' +
        '--cap-drop ALL --security-opt no-new-privileges ' +
        '--user 65534:65534 --ulimit fsize=10485760 ' +
        `-v "${workDir}/probe.sh:/work/probe.sh:ro" -w /work --name ${containerName} ` +
        `${BRACE_RUNNER_IMAGE} sh /work/probe.sh`,
      { stdio: 'pipe', timeout: 15000 }
    );
  } catch (e: any) {
    const stderr = e.stderr ? e.stderr.toString() : "";
    const stdout = e.stdout ? e.stdout.toString() : "";
    const combined = stdout + stderr;
    const requiredBlocked = [
      "APP_BLOCKED", "ENV_BLOCKED", "PROC_BLOCKED",
      "OUTSIDE_BLOCKED", "SECRET_BLOCKED",
      "NET_REDIS_BLOCKED", "NET_POSTGRES_BLOCKED", "NET_METADATA_BLOCKED",
    ];
    for (const token of requiredBlocked) {
      if (!combined.includes(token)) {
        throw new Error(`Sandbox probe failed: ${token} not found in output: ${combined.substring(0, 200)}`);
      }
    }
    if (!combined.includes("uid=65534")) {
      throw new Error(`Sandbox probe failed: expected uid=65534, got: ${combined.substring(0, 200)}`);
    }
  }
}

function getJavaClassName(code: string): string {
  const match = code.match(/^\s*(?:public\s+)?class\s+(\w+)/m);
  return match ? match[1] : 'Main';
}

// Escape a string for safe inclusion in a single-quoted shell string.
function shQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export async function executeDirectly(
  language: string,
  code: string,
  stdin: string,
  runTimeoutMs: number,
  compileTimeoutMs: number,
): Promise<ExecutionResult> {
  const spec = LANG_SPECS[language as keyof typeof LANG_SPECS];
  if (!spec) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const nodeMode = process.env.NODE_MODE || process.env.NODE_ENV;
  const isProduction = nodeMode === 'production';
  const allowUnsandboxed = process.env.ALLOW_UNSANDBOXED === '1';
  const sandboxOk = await sandboxAvailable();

  if (!sandboxOk) {
    if (isProduction && !allowUnsandboxed) {
      return {
        stdout: "",
        stderr: "Sandbox unavailable: refusing to execute user code",
        exitCode: 1,
        runtimeMs: 0,
        error: "Sandbox unavailable: refusing to execute user code",
      };
    }
    if (!allowUnsandboxed) {
      return {
        stdout: "",
        stderr: "Sandbox unavailable: set ALLOW_UNSANDBOXED=1 to bypass (not recommended)",
        exitCode: 1,
        runtimeMs: 0,
        error: "Sandbox unavailable: set ALLOW_UNSANDBOXED=1 to bypass (not recommended)",
      };
    }
  }

  const useSandbox = sandboxOk;

  const workDir = mkdtempSync(join(tmpdir(), "brace-exec-"));
  chmodSync(workDir, 0o700);

  const fileName = language === "java" ? `${getJavaClassName(code)}.java` : `Main${spec.ext}`;
  const filePath = join(workDir, fileName);
  writeFileSync(filePath, code, "utf8");

  let compileError: string | undefined;
  let runOutput = "";
  let runExitCode: number | null = 0;
  let runStderr = "";
  let runtimeMs = 0;
  let runError: string | undefined;

  try {
    if (spec.compileCmd) {
      // Compiled languages: compile and run in a single container invocation.
      const memMB = MEMORY_LIMITS_MB[language].compile;
      const cpuSec = Math.ceil(runTimeoutMs / 1000);
      const result = useSandbox
        ? await runDockerCommand(
            spec.runCmd[0],
            spec.runCmd.slice(1),
            memMB,
            cpuSec,
            workDir,
            stdin,
            fileName,
            language,
          )
        : await runDirectCommand(
            spec.runCmd[0],
            spec.runCmd.slice(1),
            Math.max(compileTimeoutMs, runTimeoutMs),
            stdin,
            workDir,
          );
      runOutput = result.stdout;
      runExitCode = result.code;
      runStderr = result.stderr;
      runtimeMs = result.runtimeMs;
      runError = result.error;
    } else {
      // Interpreted languages: just run.
      const memMB = MEMORY_LIMITS_MB[language].run;
      const cpuSec = Math.ceil(runTimeoutMs / 1000);
      const result = useSandbox
        ? await runDockerCommand(
            spec.runCmd[0],
            spec.runCmd.slice(1),
            memMB,
            cpuSec,
            workDir,
            stdin,
            fileName,
            language,
          )
        : await runDirectCommand(
            spec.runCmd[0],
            spec.runCmd.slice(1),
            runTimeoutMs,
            stdin,
            workDir,
          );
      runOutput = result.stdout;
      runExitCode = result.code;
      runStderr = result.stderr;
      runtimeMs = result.runtimeMs;
      runError = result.error;
    }
  } catch (err) {
    runError = String(err).substring(0, MAX_OUTPUT_BYTES);
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }

  if (compileError) {
    return {
      stdout: "",
      stderr: compileError,
      exitCode: 1,
      runtimeMs: 0,
      error: `Compilation Error: ${compileError}`,
    };
  }

  if (runError) {
    return {
      stdout: runOutput,
      stderr: runStderr,
      exitCode: runExitCode ?? 0,
      runtimeMs,
      error: runError,
    };
  }

  return {
    stdout: runOutput,
    stderr: runStderr,
    exitCode: runExitCode ?? 0,
    runtimeMs,
  };
}

interface RunCommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  error?: string;
}

async function runDockerCommand(
  cmd: string,
  args: string[],
  memoryMB: number,
  cpuSec: number,
  workDir: string,
  input: string,
  sourceFileName: string,
  language: string,
): Promise<RunCommandResult> {
  const containerName = `brace-job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const start = performance.now();

  const tmpFsTmp = language === 'java' ? TMPFS_TMP_COMPILE_MB : TMPFS_TMP_RUN_MB;

  const dockerArgs = [
    'run', '--rm', '--network', 'none', '--interactive',
    '--memory', `${memoryMB}m`, '--memory-swap', `${memoryMB}m`,
    '--pids-limit', '64',
    '--cpus', '1',
    '--read-only',
    '--tmpfs', `/work:exec,size=${TMPFS_WORK_MB}m`,
    '--tmpfs', `/tmp:exec,size=${tmpFsTmp}m`,
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--user', '65534:65534',
    '--ulimit', `fsize=${MAX_FSIZE_BYTES}`,
    '-v', `${workDir}/${sourceFileName}:/work/${sourceFileName}:ro`,
    '-w', '/work',
    '--name', containerName,
    BRACE_RUNNER_IMAGE,
  ];

  const isCompiled = language === 'java' || language === 'cpp' || language === 'c';
  let innerCmd: string;
  if (isCompiled) {
    const src = shQuote(sourceFileName);
    const compileCmd = language === 'java'
      ? `javac -J-Xmx256m -J-XX:TieredStopAtLevel=1 /work/${src} -d /tmp`
      : language === 'cpp'
        ? `g++ -O1 -pipe -fno-use-linker-plugin -o /tmp/a.out /work/${src}`
        : `gcc -O1 -pipe -fno-use-linker-plugin -o /tmp/a.out /work/${src}`;
    const runPart = language === 'java'
      ? 'java -cp /tmp Main'
      : '/tmp/a.out';
    innerCmd = `cp /work/${src} /tmp/${src} && ${compileCmd} && timeout -s KILL ${cpuSec} ${runPart}`;
  } else {
    innerCmd = `timeout -s KILL ${cpuSec} ${cmd} /work/${shQuote(sourceFileName)} ${args.map(shQuote).join(' ')}`;
  }

  dockerArgs.push('sh', '-c', innerCmd);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn('docker', dockerArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      killSignal: "SIGKILL",
    });

    const killAndRemove = () => {
      if (killed) return;
      killed = true;
      try { child.kill("SIGKILL"); } catch {}
      spawn('docker', ['kill', containerName], { stdio: 'ignore' });
      spawn('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
    };

    const capData = (buf: string, chunk: Buffer | string) => {
      const s = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      if (buf.length + s.length > MAX_OUTPUT_BYTES) {
        return buf + s.slice(0, Math.max(0, MAX_OUTPUT_BYTES - buf.length));
      }
      return buf + s;
    };

    child.stdout?.on("data", (d) => { stdout = capData(stdout, d); });
    child.stderr?.on("data", (d) => { stderr = capData(stderr, d); });

    child.on("error", (err) => {
      killAndRemove();
      resolve({
        code: -1,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
        error: err.message,
      });
    });

    child.on("close", (code, signal) => {
      const exitCode = code !== null ? code : (signal ? 128 : 0);
      resolve({
        code: exitCode,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
      });
    });

    if (input) {
      child.stdin?.write(input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    const timeoutMs = cpuSec * 1000 + 10000;
    setTimeout(() => {
      killAndRemove();
    }, timeoutMs);
  });
}

async function runDirectCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
  input: string,
  workDir: string,
): Promise<RunCommandResult> {
  const start = performance.now();
  let stdout = "";
  let stderr = "";

  return new Promise((resolve) => {
    const cpuSec = Math.ceil(timeoutMs / 1000);
    const child = spawn(
      'prlimit',
      [`--cpu=${cpuSec}`, `--fsize=${MAX_FSIZE_BYTES}`, cmd, ...args],
      {
        cwd: workDir,
        stdio: ["pipe", "pipe", "pipe"],
        killSignal: "SIGTERM",
        env: {
          PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/run/user/1000/fnm_multishells/23025_1794546079314/bin',
          HOME: workDir,
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          TZ: 'UTC',
        },
      },
    );

    let timer: NodeJS.Timeout | null = null;
    let killed = false;

    const killChild = () => {
      if (killed) return;
      killed = true;
      try { child.kill('SIGKILL'); } catch {}
    };

    const capData = (buf: string, chunk: Buffer | string) => {
      const s = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      if (buf.length + s.length > MAX_OUTPUT_BYTES) {
        return buf + s.slice(0, Math.max(0, MAX_OUTPUT_BYTES - buf.length));
      }
      return buf + s;
    };

    child.stdout?.on("data", (d) => { stdout = capData(stdout, d); });
    child.stderr?.on("data", (d) => { stderr = capData(stderr, d); });

    child.on("error", (err) => {
      clearTimeout(timer!);
      resolve({
        code: -1,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
        error: err.message,
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer!);
      const exitCode = code !== null ? code : (signal ? 128 : 0);
      resolve({
        code: exitCode,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
      });
    });

    if (input) {
      child.stdin?.write(input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    timer = setTimeout(() => {
      killChild();
    }, timeoutMs);
  });
}

export async function assertProductionSafety(): Promise<void> {
  const nodeMode = process.env.NODE_MODE || process.env.NODE_ENV;
  const isProduction = nodeMode === 'production';
  const allowUnsandboxed = process.env.ALLOW_UNSANDBOXED === '1';

  if (isProduction && allowUnsandboxed) {
    throw new Error(
      'REFUSING TO START: ALLOW_UNSANDBOXED=1 is set in production. ' +
      'This disables sandbox isolation and is a security risk. ' +
      'Remove ALLOW_UNSANDBOXED=1 from your production environment.',
    );
  }

  const sandboxOk = await sandboxAvailable();
  if (isProduction && !sandboxOk) {
    throw new Error(
      'REFUSING TO START: Sandbox isolation is unavailable in production. ' +
      'Run the executor with Docker access (docker group or root in container).',
    );
  }

  if (!isProduction && allowUnsandboxed && !sandboxOk) {
    console.warn(
      'WARNING: ALLOW_UNSANDBOXED=1 is set and sandbox is unavailable. ' +
      'User code will run without isolation. Do not use this in production.',
    );
  }
}