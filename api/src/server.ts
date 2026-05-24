import { type ServerType, serve } from "@hono/node-server";
import app from "./app.js";
import { connectDb, disconnectDb } from "./lib/db.js";
import { env } from "./lib/env.js";
import { ensureIndexes } from "./lib/indexes.js";
import { ensureRootUser } from "./seed/root.js";

const port = Number(process.env.PORT) || 3000;

let server: ServerType;
let isShuttingDown = false;

async function start(): Promise<void> {
	await connectDb();
	await ensureIndexes();

	// Dev/test convenience: bootstrap root account on every startup.
	// Production must provision the first admin some other way (CLI seed,
	// operator-set env, etc.) — never the in-source "root/root" default.
	if (env().NODE_ENV !== "production") {
		await ensureRootUser();
	}

	server = serve({ fetch: app.fetch, port }, () => {
		console.log(`\n  🚀 Server running at http://localhost:${port}\n`);
	});
}

async function shutdown(): Promise<void> {
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.log("\n  Shutting down gracefully...");

	if (server) {
		if ("closeAllConnections" in server) {
			server.closeAllConnections();
		}
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		});
	}

	await disconnectDb();

	console.log("  Goodbye.\n");
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Rejection:", reason);
	process.exit(1);
});

process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	process.exit(1);
});

start().catch((err) => {
	console.error("Failed to start server:", err);
	process.exit(1);
});
