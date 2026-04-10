import { z } from "zod";

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  errors: FieldError[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate data against a Zod schema. Returns a discriminated union
 * so callers can handle success/failure without try/catch.
 *
 * Usage in route handlers:
 * ```ts
 * const result = validate(CreateClientSchema, body);
 * if (!result.success) return Response.json({ errors: result.errors }, { status: 400 });
 * const client = await prisma.client.create({ data: result.data });
 * ```
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  return {
    success: false,
    errors: formatZodErrors(parsed.error),
  };
}

/**
 * Parse data or throw. Use in trusted internal contexts (workers, scripts)
 * where invalid data is a programming error, not user input.
 */
export function parse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

function formatZodErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
