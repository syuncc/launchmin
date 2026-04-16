import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import router from "./router.js";
import { error } from "./utils/response.js";

const app = new Hono();

if (!process.env.CORS_ORIGIN) {
	console.warn(
		"\n  \x1b[33m⚠ CORS_ORIGIN is not set, all cross-origin requests will be rejected\x1b[0m\n",
	);
}

app.use(requestId());
app.use(secureHeaders());
app.use(
	cors({
		origin: process.env.CORS_ORIGIN!,
		credentials: true,
	}),
);

app.onError((err, c) => {
	console.error(err);
	return error(c, 500, "Internal server error", "INTERNAL_ERROR");
});

const API_BASE = process.env.API_BASE || "/api";
app.route(API_BASE, router);

export default app;
