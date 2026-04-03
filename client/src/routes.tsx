import type { RouteObject } from "react-router";
import App from "./App";

const routes: RouteObject[] = [
	{
		path: "/",
		element: <App />,
		children: [],
	},
];

export default routes;
