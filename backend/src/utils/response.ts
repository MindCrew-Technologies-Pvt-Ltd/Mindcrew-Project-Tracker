import { Response } from 'express';

export const success = <T>(res: Response, data: T, message = 'Success', statusCode = 200): Response =>
  res.status(statusCode).json({ success: true, message, data });

export const paginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message = 'Success'
): Response =>
  res.status(200).json({ success: true, message, data: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });

export const error = (res: Response, message: string, statusCode = 400, errors?: unknown[]): Response => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors?.length) body.errors = errors;
  return res.status(statusCode).json(body);
};
