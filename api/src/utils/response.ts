import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export function success(
	c: Context,
	status: ContentfulStatusCode,
	message: string,
	data?: unknown,
) {
	return c.json({ success: true, message, data }, status);
}

export function error(
	c: Context,
	status: ContentfulStatusCode,
	message: string,
	code: string,
	details?: unknown[],
) {
	return c.json(
		{
			success: false,
			message,
			error: { code, ...(details && { details }) },
		},
		status,
	);
}

export function paginated(
	c: Context,
	message: string,
	data: unknown[],
	pagination: Pagination,
) {
	return c.json({ success: true, message, data, pagination }, 200);
}
