import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/authentication.js';
import { prisma } from '../lib/prisma.js';

// Prisma client does not expose Feedback / QuestionReport / Setting models yet;
// callers in routes/admin.ts still register these endpoints. Keep behavior
// unchanged at runtime (these will throw if invoked) but allow the build/tests
// to compile.
const db = prisma as any;

// ─────────────────────────────────────────────────────────
// Middleware helper: role check
// ─────────────────────────────────────────────────────────

async function isAdminReq(req: AuthRequest): Promise<{ userId: string; ok: boolean }> {
  const userId = req.userId as string | undefined;
  if (!userId) return { userId: '', ok: false };
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return { userId, ok: (caller?.role || '').toUpperCase() === 'ADMIN' };
}

// ─────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────

export const listUsers = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json({ users });
};

export const updateUser = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const userId = String(req.params.userId ?? "");
  const { role } = req.body as { role?: string };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: role ? { role } : {},
    select: { id: true, username: true, email: true, role: true },
  });

  return res.json({ user: updated });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const userId = String(req.params.userId ?? "");
  await prisma.user.delete({ where: { id: userId } });
  return res.json({ status: 'ok', message: 'User deleted' });
};

// ─────────────────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────────────────

export const listFeedback = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const feedback = await db.feedback.findMany({
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ feedback });
};

export const resolveFeedback = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const id = String(req.params.id ?? "");
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };

  const updated = await db.feedback.update({
    where: { id },
    data: {
      status: status as any,
      adminNote: adminNote || undefined,
    },
    include: { user: { select: { id: true, username: true } } },
  });

  return res.json({ feedback: updated });
};

// ─────────────────────────────────────────────────────────
// QUESTION REPORTS
// ─────────────────────────────────────────────────────────

export const listReports = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const reports = await db.questionReport.findMany({
    include: { reporter: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ reports });
};

export const actOnReport = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const { reportId } = req.params;
  const { status } = req.body as { status: 'DISMISSED' | 'APPROVED' };

  const updated = await db.questionReport.update({
    where: { id: reportId },
    data: { status: status as any },
    });

  return res.json({ report: updated });
};

// ─────────────────────────────────────────────────────────
// QUESTION MANAGEMENT
// ─────────────────────────────────────────────────────────

export const listQuestions = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const questions = await prisma.problem.findMany({
    include: { test_cases: true, code_snippets: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ questions });
};

export const createQuestion = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const { name, difficulty_level, problem_definition, hints = [], timeLimitMs = 600000 } = req.body as {
    name: string;
    difficulty_level: 'EASY' | 'MEDIUM' | 'HARD';
    problem_definition: string;
    hints?: string[];
    timeLimitMs?: number;
  };

  const question = await prisma.problem.create({
    data: { name, difficulty_level, problem_definition, problem_hints: hints, timeLimitMs },
  });

  return res.status(201).json({ question });
};

export const updateQuestion = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const questionId = String(req.params.questionId ?? "");
  const { name, difficulty_level, problem_definition, hints, timeLimitMs } = req.body as {
    name?: string; difficulty_level?: 'EASY' | 'MEDIUM' | 'HARD';
    problem_definition?: string; hints?: string[]; timeLimitMs?: number;
  };

  const question = await prisma.problem.update({
    where: { id: questionId },
    data: { name, difficulty_level, problem_definition, problem_hints: hints, timeLimitMs },
  });

  return res.json({ question });
};

export const deleteQuestion = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const questionId = String(req.params.questionId ?? "");
  await prisma.problem.delete({ where: { id: questionId } });
  return res.json({ status: 'ok', message: 'Question deleted' });
};

// ─────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────

export const getSettings = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const rows = await db.setting.findMany({ orderBy: { key: 'asc' } });
  const map: Record<string, any> = {};
  rows.forEach((r: any) => {
    try {
      map[r.key] = typeof r.value === 'string' && r.value.startsWith('{') ? JSON.parse(r.value) : r.value;
    } catch {
      map[r.key] = r.value;
    }
  });
  return res.json({ settings: map });
};

export const updateSetting = async (req: Request, res: Response) => {
  const { ok } = await isAdminReq(req);
  if (!ok) return res.status(403).json({ status: 'error', message: 'Admin access required' });

  const key = String(req.params.key ?? "");
  const { value } = req.body as { value: any };

  const setting = await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return res.json({ setting });
};

