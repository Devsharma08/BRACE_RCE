import { spawn } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
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
  javascript: { ext: ".js", runCmd: ["node"] },
  python: { ext: ".py", runCmd: ["python3"] },
  java: { ext: ".java", compileCmd: ["javac"], runCmd: ["java", "Main"] },
  cpp: { ext: ".cpp", compileCmd: ["g++", "-O2", "-o", "a.out"], runCmd: ["./a.out"] },
  c: { ext: ".c", compileCmd: ["gcc", "-O2", "-o", "a.out"], runCmd: ["./a.out"] },
};

/**
 * Execute code directly using system runtimes instead of Piston.
 *
 * Supports: javascript, python, java, cpp, c
 *
 * Returns stdout, stderr, exit code, and runtime in ms.
 */
export async function executeDirectly(
  language: string,
  code: string,
  stdin: string,
  timeoutMs: number,
): Promise<ExecutionResult> {
  const spec = LANG_SPECS[language];
  if (!spec) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const workDir = join(tmpdir(), `brace-exec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(workDir, { recursive: true });

  const fileName = `Main${spec.ext}`;
  const filePath = join(workDir, fileName);
  writeFileSync(filePath, code, "utf8");

  let compileError: string | undefined;
  let runOutput = "";
  let runExitCode: number | null = 0;
  let runStderr = "";
  let runtimeMs = 0;
  let runError: string | undefined;

  try {
    // Compile step (Java, C, C++)
    if (spec.compileCmd) {
      const compileResult = await runCommand(
        spec.compileCmd[0],
        spec.compileCmd.slice(1),
        { cwd: workDir, timeout: 30000 },
      );
      if (compileResult.code !== 0) {
        compileError = (compileResult.stderr || "Compilation failed").substring(0, 64 * 1024);
      }
    }

    // Run step
    if (!compileError) {
      const runResult = await runCommand(
        spec.runCmd[0],
        spec.runCmd.slice(1),
        { cwd: workDir, timeout: timeoutMs, input: stdin },
      );
      runOutput = runResult.stdout;
      runExitCode = runResult.code;
      runStderr = runResult.stderr;
      runtimeMs = runResult.runtimeMs;
      runError = runResult.error;
    }
  } catch (err) {
    runError = String(err).substring(0, 64 * 1024);
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

async function runCommand(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout: number; input?: string },
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  error?: string;
}> {
  const start = performance.now();
  let stdout = "";
  let stderr = "";

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      killSignal: "SIGTERM",
    });

    let timer: NodeJS.Timeout | null = null;

    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });

    child.on("error", (err) => {
      resolve({
        code: -1,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
        error: err.message,
      });
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        code,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
      });
    });

    if (opts.input) {
      child.stdin?.write(opts.input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, opts.timeout);
  });
}
