import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { refresh } from "./api/auth";
import { getCookie } from "./lib/cookies";
import { useAuthStore } from "./stores/auth";

// Bootstrap: if a refresh-token session exists (CSRF cookie present), try to
// silently restore the session. Otherwise proceed unauthenticated immediately.
function App() {
	const [bootstrapping, setBootstrapping] = useState(true);
	const setTokens = useAuthStore((s) => s.setTokens);

	useEffect(() => {
		// No prior session signal — skip the network round-trip.
		if (!getCookie("__Host-csrf")) {
			setBootstrapping(false);
			return;
		}

		refresh()
			.then((r) => setTokens(r.accessToken, r.expiresIn))
			.catch(() => {
				// Refresh-token expired / revoked — stay logged out.
			})
			.finally(() => setBootstrapping(false));
	}, [setTokens]);

	if (bootstrapping) {
		return (
			<Box
				sx={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	return <Outlet />;
}

export default App;
