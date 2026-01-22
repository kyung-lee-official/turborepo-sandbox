import { z } from "zod";

/* PayPal Order Schema */
export const payPalAmountSchema = z.object({
  currency_code: z.string().min(3).max(3),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const payPalPurchaseUnitSchema = z.object({
  reference_id: z.string().optional(),
  amount: payPalAmountSchema,
  description: z.string().optional(),
  custom_id: z.string().optional(),
  invoice_id: z.string().optional(),
});

export const payPalAddressSchema = z.object({
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  admin_area_1: z.string().optional(),
  admin_area_2: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().length(2).optional(),
});

export const payPalExperienceContextSchema = z.object({
  return_url: z.url().optional(),
  cancel_url: z.url().optional(),
});

export const payPalPaymentSourceSchema = z.object({
  paypal: z
    .object({
      address: payPalAddressSchema.optional(),
      email_address: z.string().email().optional(),
      payment_method_preference: z
        .enum(["UNRESTRICTED", "IMMEDIATE_PAYMENT_REQUIRED"])
        .optional(),
      experience_context: payPalExperienceContextSchema.optional(),
    })
    .optional(),
});

export const intentEnum = z.enum(["CAPTURE", "AUTHORIZE"]);

export const createOrderSchema = z.object({
  intent: intentEnum,
  purchase_units: z.array(payPalPurchaseUnitSchema).min(1),
  payment_source: payPalPaymentSourceSchema.optional(),
});
