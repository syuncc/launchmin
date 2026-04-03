import { Hono } from "hono";

const router = new Hono();

router.get("/health", (c) => {
	return c.json({ success: true, message: "OK" });
});

// router.route("/api/auth", auth);
// router.route("/api/users", users);
// router.route("/api/roles", roles);

export default router;
