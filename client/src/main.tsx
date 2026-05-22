import "@fontsource-variable/inter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { z } from "zod";
import "./i18n";
import { zodErrorMap } from "./lib/zod-errors";
import routes from "./routes";
import theme from "./theme";

// Install Zod's global error map so every client-side parse uses translated
// messages. Must come after "./i18n" is imported so i18n is initialized.
z.setErrorMap(zodErrorMap);

const router = createBrowserRouter(routes);

// biome-ignore lint/style/noNonNullAssertion: root element guaranteed in index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<RouterProvider router={router} />
		</ThemeProvider>
	</StrictMode>,
);
