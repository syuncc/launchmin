import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	cssVariables: true,
	colorSchemes: {
		light: true,
		dark: {
			palette: {
				background: {
					default: "#09090b",
					paper: "#141414",
				},
			},
		},
	},
	typography: {
		fontFamily: '"Inter Variable", "Inter", -apple-system, sans-serif',
		fontSize: 14,
		button: {
			textTransform: "none",
			fontWeight: 500,
		},
		h1: { letterSpacing: "-0.03em" },
		h2: { letterSpacing: "-0.025em" },
		h3: { letterSpacing: "-0.02em" },
		h4: { letterSpacing: "-0.015em" },
		h5: { letterSpacing: "-0.01em" },
		h6: { letterSpacing: "-0.005em" },
	},
	shape: {
		borderRadius: 8,
	},
	transitions: {
		duration: {
			standard: 200,
			short: 150,
			enteringScreen: 200,
			leavingScreen: 150,
		},
	},
	spacing: 8,
});

export default theme;
