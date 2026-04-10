import type { FieldError } from "@antellion/core";

/**
 * Standard return type for all server actions.
 * - null = initial state (no submission yet)
 * - errors = field-level validation failures
 * - message = form-level error (DB constraint, not found, etc.)
 */
export type ActionState = {
  errors?: FieldError[];
  message?: string;
} | null;

/** Extract a field-level error message from action state. */
export function fieldError(
  state: ActionState,
  field: string,
): string | undefined {
  return state?.errors?.find((e) => e.field === field)?.message;
}

/** Convert FormData entry to string or undefined (for optional fields). */
export function optionalString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
