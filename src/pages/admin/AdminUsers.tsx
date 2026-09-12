import { useState } from 'react';
import { useAdminUsers, useUpdateUser, useDeleteUser, type AdminUser } from '../../hooks/useAdmin';
import { toast } from 'sonner';

const roleOptions = ['USER', 'ADMIN'];

const AdminUsers = () => {
  const { data: users, isLoading, refetch } = useAdminUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    if (newRole === user.role) return;
    const confirmed = window.confirm(
      `Change role for ${user.username} to ${newRole}? This action affects permissions.`
    );
    if (!confirmed) return;

    setUpdatingId(user.id);
    try {
      await updateUser.mutateAsync({ userId: user.id, role: newRole });
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Permanently delete user "${user.username}"?\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      await deleteUser.mutateAsync(user.id);
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 pb-4">
          <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase">
            USER MANAGEMENT
          </h1>
          <span className="text-xs text-slate-500 font-mono">
            {users?.length || 0} OPERATIVES REGISTERED
          </span>
        </div>

        {/* Users Table */}
        <div className="rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60 bg-[#06080e] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="p-4 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-400 tracking-widest relative z-10">
            <span>USER DIRECTORY</span>
          </div>

          <div className="overflow-y-auto relative z-10">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">LOADING OPERATIVES...</div>
            ) : !users || users.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">NO USERS FOUND</div>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Username</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Role</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Created</th>
                    <th className="px-4 py-2 text-right text-slate-500 tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-black/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-bold">{user.username}</td>
                      <td className="px-4 py-3 text-slate-400">{user.email || '—'}</td>
                      <td className="px-4 py-3">
                        {updatingId === user.id ? (
                          <span className="text-cyan-400">UPDATING...</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value)}
                            className="text-xs font-bold rounded-none border border-white/20 bg-[#02040a] text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 uppercase"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="px-3 py-1.5 rounded-none border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 font-bold text-xs tracking-widest transition-all disabled:opacity-50"
                        >
                          {deletingId === user.id ? 'DELETING...' : 'DELETE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;