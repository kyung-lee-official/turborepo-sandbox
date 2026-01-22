import z from "zod";
import { intentEnum, payPalAddressSchema, payPalAmountSchema } from "../order";

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
    email_address: z.email(),
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
  transmission_id: z.uuid(),
  status: z.string(),
  timestamp: z.iso.datetime(),
});

export const payPalCheckoutOrderApprovedEventSchema = z.object({
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
