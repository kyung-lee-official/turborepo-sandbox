import z from "zod";
import { payPalAmountSchema } from "../order";
import {
  payPalLinkSchema,
  payPalTransmissionSchema,
} from "./CHECKOUT.ORDER.APPROVED.schemas";
import { payPalSellerProtectionSchema } from "./PAYMENT.AUTHORIZATION.CREATED.schemas";

/* PayPal Capture Webhook Schemas */

export const payPalCaptureRelatedIdsSchema = z.object({
  authorization_id: z.string(),
  order_id: z.string(),
});

export const payPalCaptureSupplementaryDataSchema = z.object({
  related_ids: payPalCaptureRelatedIdsSchema,
});

export const payPalCapturePayeeSchema = z.object({
  email_address: z.string().email(),
  merchant_id: z.string(),
});

export const payPalSellerReceivableBreakdownSchema = z.object({
  paypal_fee: payPalAmountSchema,
  gross_amount: payPalAmountSchema,
  net_amount: payPalAmountSchema,
});

export const payPalCaptureResourceSchema = z.object({
  disbursement_mode: z.string(),
  payee: payPalCapturePayeeSchema,
  amount: payPalAmountSchema,
  seller_protection: payPalSellerProtectionSchema,
  supplementary_data: payPalCaptureSupplementaryDataSchema,
  update_time: z.string(), // ISO datetime string
  create_time: z.string(), // ISO datetime string
  final_capture: z.boolean(),
  seller_receivable_breakdown: payPalSellerReceivableBreakdownSchema,
  links: z.array(payPalLinkSchema),
  id: z.string(),
  status: z.string(),
});

export const payPalCaptureWebhookEventSchema = z.object({
  id: z.string(),
  create_time: z.string(), // ISO datetime string
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string(),
  resource: payPalCaptureResourceSchema,
  status: z.string(),
  transmissions: z.array(payPalTransmissionSchema),
  links: z.array(payPalLinkSchema),
  event_version: z.string(),
  resource_version: z.string(),
});
