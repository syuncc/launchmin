import { ERROR_CODES } from "@launchmin/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./lib/env.js";
import { AppError } from "./lib/errors.js";
import router from "./router.js";
import { error } from "./utils/response.js";

const app = new Hono();
const e = env();

app.use(requestId());
app.use(secureHeaders());
app.use(
	cors({
		origin: e.CORS_ORIGIN,
		credentials: true,
	}),
);

app.onError((err, c) => {
	if (err instanceof AppError) {
		return error(c, err.statusCode, err.message, err.code);
	}
	console.error(err);
	return error(c, 500, "Internal server error", ERROR_CODES.INTERNAL_ERROR);
});

app.route(e.API_BASE, router);

export default app;
