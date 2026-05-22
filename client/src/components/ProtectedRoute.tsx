import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../stores/auth";

export function ProtectedRoute() {
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	if (!isAuthenticated) {
		return <Navigate to="/sign-in" replace />;
	}
	return <Outlet />;
}
