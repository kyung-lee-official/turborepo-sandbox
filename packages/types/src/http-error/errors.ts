import { z } from "zod";
import { AUTH_ERRORS } from "./codes/auth";
import { CART_ERRORS } from "./codes/cart";
import { CUSTOMER_ERRORS } from "./codes/customer";
import { MEDUSA_ERRORS } from "./codes/medusa";
import { PAYMENT_ERRORS } from "./codes/payment";
import { SYSTEM_ERRORS } from "./codes/system";
import { USER_ERRORS } from "./codes/user";

export const ERROR_CODES = {
  ...AUTH_ERRORS,
  ...CART_ERRORS,
  ...CUSTOMER_ERRORS,
  ...MEDUSA_ERRORS,
  ...PAYMENT_ERRORS,
  ...USER_ERRORS,
  ...SYSTEM_ERRORS,
} as const;
export type ErrorCode = keyof typeof ERROR_CODES;
export const ErrorCodeSchema = z.enum(
  Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]],
);
export const ERROR_CODE_TO_STATUS = ERROR_CODES;

export const HttpErrorDataSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().optional(),
  details: z.any().optional(),
  timestamp: z.string(),
});
export type HttpErrorData = z.infer<typeof HttpErrorDataSchema>;
