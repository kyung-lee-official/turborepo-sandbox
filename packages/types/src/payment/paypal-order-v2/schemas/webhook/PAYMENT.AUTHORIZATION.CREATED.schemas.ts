import z from "zod";
import {
  payPalLinkSchema,
  payPalNameSchema,
  payPalTransmissionSchema,
} from "./CHECKOUT.ORDER.APPROVED.schemas";

/* PayPal Authorization Webhook Schemas */
export const payPalSellerProtectionSchema = z.object({
  dispute_categories: z.array(z.string()),
  status: z.string(),
});

export const payPalRelatedIdsSchema = z.object({
  order_id: z.string(),
});

export const payPalAuthorizationSupplementaryDataSchema = z.object({
  related_ids: payPalRelatedIdsSchema,
});

export const payPalAuthorizationPayeeSchema = z.object({
  email_address: z.email(),
  merchant_id: z.string(),
});

export const payPalAuthorizationResourceSchema = z.object({
  payee: payPalAuthorizationPayeeSchema,
  amount: payPalNameSchema,
  seller_protection: payPalSellerProtectionSchema,
  supplementary_data: payPalAuthorizationSupplementaryDataSchema,
  update_time: z.string(), // ISO datetime string
  create_time: z.string(), // ISO datetime string
  expiration_time: z.string(), // ISO datetime string
  links: z.array(payPalLinkSchema),
  id: z.string(),
  status: z.string(),
});

export const payPalAuthorizationWebhookEventSchema = z.object({
  id: z.string(),
  create_time: z.string(), // ISO datetime string
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string(),
  resource: payPalAuthorizationResourceSchema,
  status: z.string(),
  transmissions: z.array(payPalTransmissionSchema),
  links: z.array(payPalLinkSchema),
  event_version: z.string(),
  resource_version: z.string(),
});
