import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { error } from '../utils/response';

/**
 * Request-body validation middleware.
 *
 * Uses `stripUnknown: true` so the frontend can send extra fields without
 * breaking the request (they are simply removed), and `abortEarly: false`
 * so every validation error is returned at once.
 *
 * The Joi schemas in `src/validations/schemas.ts` are kept intentionally in
 * sync with the Yup schemas in the frontend's `src/utils/validators.ts`.
 * When you change a rule on one side, change it on the other.
 */
export const validate = (schema: ObjectSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { error: validationError, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (validationError) {
      const messages = validationError.details.map((d) => d.message);
      error(res, messages[0], 400, messages);
      return;
    }
    req.body = value; // use the sanitised payload downstream
    next();
  };
