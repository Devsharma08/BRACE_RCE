import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton } from "../ui/Skeleton";

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    // Signed-out visitors land on home, not /signin: the header offers the
    // sign-in link, and a successful sign-in navigates to "/" anyway, so
    // bouncing here only surprised people whose session had ended.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
