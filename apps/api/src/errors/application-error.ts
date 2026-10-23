import type { TanErrorCode } from "@solyne/shared";

export class ApplicationError extends Error {
  readonly code: TanErrorCode;
  readonly status: number;

  constructor(code: TanErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
  }
}
