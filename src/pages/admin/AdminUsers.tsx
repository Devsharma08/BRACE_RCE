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
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
            USER MANAGEMENT
          </h1>
          <span className="text-xs text-faint font-mono">
            {users?.length || 0} OPERATIVES REGISTERED
          </span>
        </div>

        {/* Users Table */}
        <div className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-primary/40 bg-raised overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="p-4 border-b border-subtle-line flex items-center justify-between text-xs font-bold text-subtle tracking-widest relative z-10">
            <span>USER DIRECTORY</span>
          </div>

          <div className="overflow-y-auto overflow-x-auto relative z-10">
            {isLoading ? (
              <div className="p-8 text-center text-faint text-xs">LOADING OPERATIVES...</div>
            ) : !users || users.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">NO USERS FOUND</div>
            ) : (
              <table className="w-full min-w-[40rem] text-xs font-mono">
                <thead>
                  <tr className="border-b border-subtle-line">
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Username</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Role</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Created</th>
                    <th className="px-4 py-2 text-right text-faint tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-subtle-line hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-3 text-fg font-bold">{user.username}</td>
                      <td className="px-4 py-3 text-subtle">{user.email || '—'}</td>
                      <td className="px-4 py-3">
                        {updatingId === user.id ? (
                          <span className="text-accent-primary">UPDATING...</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value)}
                            className="text-xs font-bold rounded-none border border-subtle-line bg-base text-fg focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary uppercase"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-faint">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="px-3 py-1.5 rounded-none border border-accent-danger/40 bg-accent-danger/10 hover:bg-accent-danger/10 text-accent-danger hover:text-accent-danger font-bold text-xs tracking-widest transition-all disabled:opacity-50"
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