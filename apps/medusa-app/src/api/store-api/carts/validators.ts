import { z } from "@medusajs/framework/zod";
import { AddressPayload } from "@/api/utils/common-validators";
import { createSelectParams, WithAdditionalData } from "@/api/utils/validators";

export const StoreGetCartsCart = createSelectParams();

const ItemSchema = z.object({
  variant_id: z.string(),
  quantity: z.number().gt(0),
  metadata: z.record(z.unknown()).nullish(),
});

export const CreateCart = z
  .object({
    region_id: z.string().nullish(),
    shipping_address: z.union([AddressPayload, z.string()]).optional(),
    billing_address: z.union([AddressPayload, z.string()]).optional(),
    email: z.string().email().nullish(),
    currency_code: z.string().nullish(),
    items: z.array(ItemSchema).optional(),
    sales_channel_id: z.string().nullish(),
    promo_codes: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).nullish(),
    locale: z.string().nullish(),
  })
  .strict();
export const StoreCreateCart = WithAdditionalData(CreateCart);

export type StoreAddCartLineItemType = z.infer<typeof StoreAddCartLineItem>;
export const StoreAddCartLineItem = z.object({
  variant_id: z.string(),
  quantity: z.number().gt(0),
  metadata: z.record(z.unknown()).nullish(),
});

export const UpdateLineItemRequest = z.object({
  quantity: z.number().min(0),
});

export const DeleteLineItemRequest = z
  .object({
    item_id: z.string().optional(),
    variant_id: z.string().optional(),
  })
  .refine((data) => data.item_id || data.variant_id, {
    message: "Either item_id or variant_id must be provided",
  })
  .refine((data) => !(data.item_id && data.variant_id), {
    message: "Only one of item_id or variant_id should be provided, not both",
  });
