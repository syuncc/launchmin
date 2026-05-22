import { Hono } from "hono";
import auth from "./auth/auth.routes.js";
import users from "./users/users.routes.js";

const router = new Hono();

router.get("/health", (c) => {
	return c.json({ success: true, message: "OK" });
});

router.route("/users", users);
router.route("/auth", auth);

export default router;
