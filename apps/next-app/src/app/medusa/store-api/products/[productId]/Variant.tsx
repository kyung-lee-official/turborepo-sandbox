import type { StoreProductVariant } from "@medusajs/types";
import Image from "next/image";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { AddToCartButton } from "./AddToCartButton";
import { DisplayDate } from "./DisplayDate";

interface VariantProps {
  variant: StoreProductVariant;
}

export const Variant = ({ variant }: VariantProps) => {
  return (
    <PixelSurface shadow="sm" className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-medium text-lg">
          {variant.title || `Variant ${variant.id}`}
        </h3>
        <div className="flex flex-wrap gap-2">
          {variant.manage_inventory && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-800 text-xs">
              Managed Inventory
            </span>
          )}
          {variant.allow_backorder && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800 text-xs">
              Backorder Allowed
            </span>
          )}
          {variant.variant_rank !== null && (
            <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-800 text-xs">
              Rank: {variant.variant_rank}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="font-medium text-gray-600">ID:</span>{" "}
          <span className="text-gray-900">{variant.id}</span>
        </div>
        {variant.sku && (
          <div>
            <span className="font-medium text-gray-600">SKU:</span>{" "}
            <span className="text-gray-900">{variant.sku}</span>
          </div>
        )}
        {variant.barcode && (
          <div>
            <span className="font-medium text-gray-600">Barcode:</span>{" "}
            <span className="text-gray-900">{variant.barcode}</span>
          </div>
        )}
        {variant.upc && (
          <div>
            <span className="font-medium text-gray-600">UPC:</span>{" "}
            <span className="text-gray-900">{variant.upc}</span>
          </div>
        )}
        {variant.ean && (
          <div>
            <span className="font-medium text-gray-600">EAN:</span>{" "}
            <span className="text-gray-900">{variant.ean}</span>
          </div>
        )}
        {variant.inventory_quantity !== undefined && (
          <div>
            <span className="font-medium text-gray-600">Inventory:</span>{" "}
            <span className="text-gray-900">{variant.inventory_quantity}</span>
          </div>
        )}
        {variant.weight && (
          <div>
            <span className="font-medium text-gray-600">Weight:</span>{" "}
            <span className="text-gray-900">{variant.weight}g</span>
          </div>
        )}
        {variant.length && (
          <div>
            <span className="font-medium text-gray-600">Length:</span>{" "}
            <span className="text-gray-900">{variant.length}cm</span>
          </div>
        )}
        {variant.width && (
          <div>
            <span className="font-medium text-gray-600">Width:</span>{" "}
            <span className="text-gray-900">{variant.width}cm</span>
          </div>
        )}
        {variant.height && (
          <div>
            <span className="font-medium text-gray-600">Height:</span>{" "}
            <span className="text-gray-900">{variant.height}cm</span>
          </div>
        )}
        {variant.material && (
          <div>
            <span className="font-medium text-gray-600">Material:</span>{" "}
            <span className="text-gray-900">{variant.material}</span>
          </div>
        )}
        {variant.hs_code && (
          <div>
            <span className="font-medium text-gray-600">HS Code:</span>{" "}
            <span className="text-gray-900">{variant.hs_code}</span>
          </div>
        )}
        {variant.mid_code && (
          <div>
            <span className="font-medium text-gray-600">MID Code:</span>{" "}
            <span className="text-gray-900">{variant.mid_code}</span>
          </div>
        )}
        {variant.origin_country && (
          <div>
            <span className="font-medium text-gray-600">Origin:</span>{" "}
            <span className="text-gray-900">{variant.origin_country}</span>
          </div>
        )}
      </div>

      {/* Variant Thumbnail */}
      {variant.thumbnail && (
        <div className="mt-4">
          <span className="font-medium text-gray-600">Thumbnail:</span>
          <div className="mt-2 w-24">
            <Image
              src={variant.thumbnail}
              alt={`${variant.title || "Variant"} thumbnail`}
              width={100}
              height={100}
              className="rounded bg-gray-100 object-cover"
            />
          </div>
        </div>
      )}

      {/* Variant Images */}
      {variant.images && variant.images.length > 0 && (
        <div className="mt-4">
          <span className="font-medium text-gray-600">Images:</span>
          <div className="mt-2 flex gap-2">
            {variant.images.map((image, index) => (
              <Image
                key={image.id}
                src={image.url}
                alt={`${variant.title || "Variant"} ${index + 1}`}
                width={80}
                height={80}
                className="rounded bg-gray-100 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {/* Variant Options */}
      {variant.options && variant.options.length > 0 && (
        <div className="mt-4">
          <span className="font-medium text-gray-600">Options:</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {variant.options.map((option) => (
              <span
                key={option.id}
                className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-sm"
              >
                {option.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calculated Price */}
      {variant.calculated_price && (
        <div className="mt-4">
          <span className="font-medium text-gray-600">Price:</span>
          <div className="mt-2">
            <span className="font-bold text-green-600 text-lg">
              {variant.calculated_price.currency_code?.toUpperCase()}{" "}
              {(
                (variant.calculated_price.calculated_amount || 0) / 100
              ).toFixed(2)}
            </span>
            {variant.calculated_price.original_amount !==
              variant.calculated_price.calculated_amount && (
              <span className="ml-2 text-gray-500 line-through">
                {(
                  (variant.calculated_price.original_amount || 0) / 100
                ).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-600">Add to Cart:</span>
          <AddToCartButton
            variantId={variant.id}
            variantTitle={variant.title || `Variant ${variant.id}`}
          />
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-4 grid gap-2 border-gray-200 border-t pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="font-medium text-gray-600">Created:</span>{" "}
          <span className="text-gray-900">
            <DisplayDate date={variant.created_at} />
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-600">Updated:</span>{" "}
          <span className="text-gray-900">
            <DisplayDate date={variant.updated_at} />
          </span>
        </div>
        {variant.deleted_at && (
          <div>
            <span className="font-medium text-gray-600">Deleted:</span>{" "}
            <span className="text-gray-900">
              <DisplayDate date={variant.deleted_at} />
            </span>
          </div>
        )}
      </div>

      {/* Variant Metadata */}
      {variant.metadata && (
        <div className="mt-4">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-600">
              Variant Metadata
            </summary>
            <pre className="mt-2 rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(variant.metadata, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </PixelSurface>
  );
};
