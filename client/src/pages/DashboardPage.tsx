import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth";

function DashboardPage() {
	const { t } = useTranslation("auth");
	const navigate = useNavigate();
	const clear = useAuthStore((s) => s.clear);
	const [signingOut, setSigningOut] = useState(false);

	const handleSignOut = async () => {
		setSigningOut(true);
		try {
			await logout();
		} catch {
			// Network/server issue — clear local state anyway.
		}
		clear();
		navigate("/sign-in", { replace: true });
	};

	return (
		<Box sx={{ p: { xs: 3, sm: 4 }, maxWidth: 800, mx: "auto" }}>
			<Stack spacing={3}>
				<Typography variant="h4" fontWeight={600}>
					{t("dashboard.title")}
				</Typography>
				<Typography variant="body1" color="text.secondary">
					{t("dashboard.welcome")}
				</Typography>
				<Button
					onClick={handleSignOut}
					variant="outlined"
					disabled={signingOut}
					startIcon={
						signingOut ? (
							<CircularProgress size={16} color="inherit" />
						) : undefined
					}
					sx={{ alignSelf: "flex-start" }}
				>
					{t("signOut")}
				</Button>
			</Stack>
		</Box>
	);
}

export default DashboardPage;
