/** ข้อผิดพลาดที่ตอบกลับเป็น HTTP ได้ คลาสลูกกำหนดรหัสสถานะของตัวเอง */
export abstract class HttpError extends Error {
  abstract readonly status: number;
}
export class BadRequestError extends HttpError { readonly status = 400; }
export class UnauthorizedError extends HttpError { readonly status = 401; }
export class ForbiddenError extends HttpError { readonly status = 403; }
export class NotFoundError extends HttpError { readonly status = 404; }
export class ConflictError extends HttpError { readonly status = 409; }
