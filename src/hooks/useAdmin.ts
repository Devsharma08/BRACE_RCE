import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../config/api';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedback {
  id: string;
  userId: string;
  user: { id: string; username: string; avatarUrl: string | null };
  content: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReport {
  id: string;
  questionId: string;
  reportedBy: string;
  reporter: { id: string; username: string };
  reason: string;
  status: 'FLAGGED' | 'REVIEWED' | 'DISMISSED' | 'APPROVED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestion {
  id: string;
  name: string;
  difficulty_level: 'EASY' | 'MEDIUM' | 'HARD';
  problem_definition: string;
  problem_hints: string[];
  timeLimitMs: number;
  createdAt: string;
  test_cases: Array<{ id: string; input: string; expectedOutput: string; is_public: boolean }>;
  code_snippets: Array<{ id: string; language: string; code: string }>;
}

// ─── Users ───

export const useAdminUsers = () =>
  useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.users as AdminUser[]),
  });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; role?: string }) =>
      api.patch(`/admin/users/${payload.userId}`, { role: payload.role }).then(r => r.data.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
};

// ─── Feedback ───

export const useAdminFeedback = () =>
  useQuery({
    queryKey: ['admin-feedback'],
    queryFn: () => api.get('/admin/feedback').then(r => r.data.feedback as AdminFeedback[]),
  });

export const useResolveFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; status?: string; adminNote?: string }) =>
      api.patch(`/admin/feedback/${payload.id}`, { status: payload.status, adminNote: payload.adminNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feedback'] }),
  });
};

// ─── Reports ───

export const useAdminReports = () =>
  useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => api.get('/admin/reports').then(r => r.data.reports as AdminReport[]),
  });

export const useActOnReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reportId: string; status: 'DISMISSED' | 'APPROVED' }) =>
      api.patch(`/admin/reports/${payload.reportId}`, { status: payload.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
};

// ─── Questions ───

export const useAdminQuestions = () =>
  useQuery({
    queryKey: ['admin-questions'],
    queryFn: () => api.get('/admin/questions').then(r => r.data.questions as AdminQuestion[]),
  });

export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.post('/admin/questions', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-questions'] }),
  });
};

export const useUpdateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { questionId: string; data: any }) =>
      api.patch(`/admin/questions/${payload.questionId}`, payload.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-questions'] }),
  });
};

export const useDeleteQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => api.delete(`/admin/questions/${questionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-questions'] }),
  });
};

// ─── Settings ───

export const useAdminSettings = () =>
  useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data.settings),
  });

export const useUpdateSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; value: any }) =>
      api.patch(`/admin/settings/${payload.key}`, { value: payload.value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });
};