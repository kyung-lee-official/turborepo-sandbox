import z from "zod";
import { payPalAddressSchema, payPalAmountSchema } from "./order";
import {
  payPalLinkSchema,
  payPalNameSchema,
} from "./webhook/CHECKOUT.ORDER.APPROVED.schemas";

/* PayPal Order Response Schemas */
export const payPalSellerProtectionSchema = z.object({
  status: z.string(),
  dispute_categories: z.array(z.string()),
});

export const payPalAuthorizationSchema = z.object({
  status: z.string(),
  id: z.string(),
  amount: payPalAmountSchema,
  seller_protection: payPalSellerProtectionSchema,
  expiration_time: z.string(), // ISO datetime string
  links: z.array(payPalLinkSchema),
  create_time: z.string(), // ISO datetime string
  update_time: z.string(), // ISO datetime string
});

export const payPalPaymentsSchema = z.object({
  authorizations: z.array(payPalAuthorizationSchema),
});

export const payPalShippingSchema = z.object({
  name: payPalNameSchema.optional(),
  address: payPalAddressSchema.optional(),
});

export const payPalPurchaseUnitSchema = z.object({
  reference_id: z.string(),
  shipping: payPalShippingSchema.optional(),
  payments: payPalPaymentsSchema,
});

export const payPalPaymentSourcePayPalSchema = z.object({
  email_address: z.email(),
  account_id: z.string(),
  account_status: z.string(),
  name: payPalNameSchema,
  address: payPalAddressSchema,
});

export const payPalPaymentSourceSchema = z.object({
  paypal: payPalPaymentSourcePayPalSchema,
});

export const payPalPayerSchema = z.object({
  name: payPalNameSchema,
  email_address: z.email(),
  payer_id: z.string(),
  address: payPalAddressSchema,
});

export const payPalAuthorizePaymentResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  payment_source: payPalPaymentSourceSchema,
  purchase_units: z.array(payPalPurchaseUnitSchema),
  payer: payPalPayerSchema,
  links: z.array(payPalLinkSchema),
});
