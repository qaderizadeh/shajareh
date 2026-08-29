import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(status, { message });
    this.code = code;
  }
  code?: string;
}

export function badRequest(message: string, code = "BAD_REQUEST"): ApiError {
  return new ApiError(400, message, code);
}
export function unauthorized(message = "ابتدا وارد حساب شوید", code = "UNAUTHORIZED"): ApiError {
  return new ApiError(401, message, code);
}
export function forbidden(message = "شما به این منبع دسترسی ندارید", code = "FORBIDDEN"): ApiError {
  return new ApiError(403, message, code);
}
export function notFound(message = "موردی پیدا نشد", code = "NOT_FOUND"): ApiError {
  return new ApiError(404, message, code);
}