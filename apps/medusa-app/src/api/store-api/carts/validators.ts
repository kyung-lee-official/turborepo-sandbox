import { z } from "@medusajs/framework/zod";
import { UpdateCart } from "@medusajs/medusa/api/store/carts/validators";
import { AddressPayload } from "@/api/utils/common-validators";
import { createSelectParams, WithAdditionalData } from "@/api/utils/validators";

/** Same as Medusa `StoreUpdateCart`, but rejects cart-level `metadata` (use workflows for that). */
export const StoreUpdateCartNoMetadata = WithAdditionalData(
  UpdateCart.omit({ metadata: true }),
);
export type StoreUpdateCartNoMetadataType = z.infer<
  ReturnType<typeof StoreUpdateCartNoMetadata>
>;

export const StoreGetCartsCart = createSelectParams();
export const StoreGetOrCreateCustomerCart = createSelectParams().extend({
  region_id: z.string(),
  sales_channel_id: z.string().optional(),
});

const ItemSchema = z.object({
  variant_id: z.string(),
  quantity: z.number().int().gt(0),
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
export type StoreGetOrCreateCustomerCartType = z.infer<
  typeof StoreGetOrCreateCustomerCart
>;

export type StoreAddCartLineItemType = z.infer<typeof StoreAddCartLineItem>;
export const StoreAddCartLineItem = z.object({
  variant_id: z.string(),
  quantity: z.number().int().gt(0),
});

/** Absolute quantity for a variant: selected line only, `metadata.unselected` cleared for that variant. */
export const StoreSetVariantQuantity = z.object({
  quantity: z.number().int().min(0),
});
export type StoreSetVariantQuantityType = z.infer<typeof StoreSetVariantQuantity>;

export const UpdateLineItemRequest = z.object({
  quantity: z.number().int().min(0),
});
export type UpdateLineItemBody = z.infer<typeof UpdateLineItemRequest>;

/** Remove a cart line item by Medusa line item id (for unselected rows use `POST .../variants/:variant_id/quantity` with `quantity: 0`). */
export const DeleteLineItemRequest = z.object({
  item_id: z.string(),
});
export type DeleteLineItemBody = z.infer<typeof DeleteLineItemRequest>;
