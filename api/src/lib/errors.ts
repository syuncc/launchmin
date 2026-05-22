import type { ContentfulStatusCode } from "hono/utils/http-status";

// Operational error class — services throw, global onError handler converts to response.
// statusCode is HTTP-aware because this is the api layer (not generic application logic).
export class AppError extends Error {
	readonly statusCode: ContentfulStatusCode;
	readonly code: string;

	constructor(statusCode: ContentfulStatusCode, code: string, message: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.name = this.constructor.name;
	}
}
