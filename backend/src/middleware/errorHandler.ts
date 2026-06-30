import { ErrorRequestHandler, RequestHandler } from 'express';

export class AppError extends Error {
  statusCode: number;
  errors?: unknown[];
  constructor(message: string, statusCode: number, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function isPrismaError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) { next(err); return; }

  if (err instanceof AppError) {
    const body: Record<string, unknown> = { success: false, message: err.message };
    if (err.errors) body.errors = err.errors;
    res.status(err.statusCode).json(body);
    return;
  }

  if (isPrismaError(err)) {
    if (err.code === 'P2002') { res.status(409).json({ success: false, message: 'Resource already exists' }); return; }
    if (err.code === 'P2025') { res.status(404).json({ success: false, message: 'Resource not found' }); return; }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
};

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('Route not found', 404));
};
