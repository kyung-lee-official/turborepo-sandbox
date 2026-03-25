// map of Medusa error types to HTTP status codes
export const MedusaErrorTypes = {
  database_error: {
    "MEDUSA.GENERIC_ERROR": 500,
  },
  duplicate_error: {
    "MEDUSA.DUPLICATE_ERROR": 409,
  },
  invalid_argument: {
    "MEDUSA.INVALID_ARGUMENT": 400,
  },
  unexpected_state: {
    "MEDUSA.UNEXPECTED_STATE": 400,
  },
  invalid_data: {
    "MEDUSA.INVALID_DATA": 400,
  },
  unauthorized: {
    "MEDUSA.UNAUTHENTICATED": 401,
  },
  not_found: {
    "MEDUSA.NOT_FOUND": 404,
  },
  not_allowed: {
    "MEDUSA.NOT_ALLOWED": 403,
  },
  conflict: {
    "MEDUSA.CONFLICT": 409,
  },
  payment_authorization_error: {
    "MEDUSA.PAYMENT_AUTHORIZATION_ERROR": 402,
  },
} as const;

// Extract all error code keys from MedusaErrorTypes
type ExtractErrorCodes<T> =
  T extends Record<string, infer U>
    ? U extends Record<infer K, any>
      ? K
      : never
    : never;

// Type for error categories
export type MedusaErrorCategory = keyof typeof MedusaErrorTypes;

// Type for all error code keys
export type MedusaErrorCodes = ExtractErrorCodes<typeof MedusaErrorTypes>;

// Type-safe constant object for accessing error codes
export const MEDUSA_ERRORS: Record<MedusaErrorCodes, number> = {
  "MEDUSA.GENERIC_ERROR": 500,
  "MEDUSA.DUPLICATE_ERROR": 409,
  "MEDUSA.INVALID_ARGUMENT": 400,
  "MEDUSA.UNEXPECTED_STATE": 400,
  "MEDUSA.INVALID_DATA": 400,
  "MEDUSA.UNAUTHENTICATED": 401,
  "MEDUSA.NOT_FOUND": 404,
  "MEDUSA.NOT_ALLOWED": 403,
  "MEDUSA.CONFLICT": 409,
  "MEDUSA.PAYMENT_AUTHORIZATION_ERROR": 402,
} as const;
