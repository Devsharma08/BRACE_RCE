import { Outlet, Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";

/**
 * AdminRoute — gates the /admin/* tree behind an ADMIN role check.
 *
 * Must be nested inside <ProtectedRoute> so this only ever sees an
 * already-authenticated user.
 *
 * IMPORTANT: this is presentation, not security. Every /api/admin/* endpoint
 * re-verifies the caller's role server-side and returns 403 when it doesn't
 * match, so bypassing this component grants no access. Its job is to keep
 * non-admin users out of a console they can never use, instead of letting them
 * land on a wall of failed requests.
 *
 * Signed-in non-admins get an explicit "not authorised" screen rather than a
 * silent bounce — a hard redirect looks identical to a broken link and is far
 * harder to debug from a support ticket.
 */
export const AdminRoute = () => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Clearance denied"
          message="Your account does not have administrator privileges for this console. If you believe this is a mistake, ask an existing admin to update your role."
          action={
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-btn border border-subtle-line bg-surface-hover px-4 py-2 text-xs font-bold uppercase tracking-widest text-subtle transition-colors hover:border-accent-primary/40 hover:text-fg"
            >
              Return to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  return <Outlet />;
};

export default AdminRoute;
