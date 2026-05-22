import type { RouteObject } from "react-router";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import SignInPage from "./pages/SignInPage";

const routes: RouteObject[] = [
	{
		path: "/",
		element: <App />,
		children: [
			{ path: "sign-in", element: <SignInPage /> },
			{
				element: <ProtectedRoute />,
				children: [{ path: "dashboard", element: <DashboardPage /> }],
			},
		],
	},
];

export default routes;
