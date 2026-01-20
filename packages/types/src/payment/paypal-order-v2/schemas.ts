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

/* PayPal Webhook Schemas */
export const payPalNameSchema = z.object({
  given_name: z.string().optional(),
  surname: z.string().optional(),
  full_name: z.string().optional(),
});

export const payPalPayeeSchema = z.object({
  email_address: z.email(),
  merchant_id: z.string(),
});

export const payPalShippingSchema = z.object({
  name: payPalNameSchema.optional(),
  address: payPalAddressSchema.optional(),
});

export const payPalSupplementaryDataSchema = z.object({
  tax_nexus: z.array(z.unknown()),
});

export const payPalWebhookPurchaseUnitSchema = z.object({
  reference_id: z.string(),
  amount: payPalAmountSchema,
  payee: payPalPayeeSchema,
  shipping: payPalShippingSchema.optional(),
  supplementary_data: payPalSupplementaryDataSchema.optional(),
});

export const payPalLinkSchema = z.object({
  href: z.url(),
  rel: z.string(),
  method: z.enum(["GET", "POST", "PATCH", "DELETE", "PUT"]),
  encType: z.string().optional(),
});

export const payPalWebhookPaymentSourceSchema = z.object({
  paypal: z.object({
    email_address: z.string().email(),
    account_id: z.string(),
    account_status: z.string(),
    name: payPalNameSchema,
    address: payPalAddressSchema,
  }),
});

export const payPalPayerSchema = z.object({
  name: payPalNameSchema,
  email_address: z.string().email(),
  payer_id: z.string(),
  address: payPalAddressSchema,
});

export const payPalWebhookResourceSchema = z.object({
  create_time: z.iso.datetime(),
  purchase_units: z.array(payPalWebhookPurchaseUnitSchema),
  links: z.array(payPalLinkSchema),
  id: z.string(),
  payment_source: payPalWebhookPaymentSourceSchema,
  intent: intentEnum,
  payer: payPalPayerSchema,
  status: z.string(),
});

export const payPalTransmissionSchema = z.object({
  webhook_url: z.url(),
  http_status: z.number().int(),
  reason_phrase: z.string(),
  response_headers: z.record(z.string(), z.string()),
  transmission_id: z.string().uuid(),
  status: z.string(),
  timestamp: z.iso.datetime(),
});

export const payPalWebhookEventSchema = z.object({
  id: z.string(),
  create_time: z.iso.datetime(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string(),
  resource: payPalWebhookResourceSchema,
  status: z.string(),
  transmissions: z.array(payPalTransmissionSchema),
  links: z.array(payPalLinkSchema),
  event_version: z.string(),
  resource_version: z.string(),
});
