import type { StoreProduct } from "@medusajs/types";
import Image from "next/image";
import { Card } from "@/app/medusa/components/Card";
import { DisplayDate } from "./DisplayDate";

interface ProductImagesProps {
  product: StoreProduct;
}

export const ProductImages = ({ product }: ProductImagesProps) => {
  if (!product.images || product.images.length === 0) {
    return null;
  }

  return (
    <Card variant="pixel" className="max-w-none space-y-4 p-6">
      <h2 className="mb-4 font-bold text-gray-900 text-xl">Images</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {product.images.map((image, index) => (
          <div key={image.id} className="space-y-2">
            <div className="relative">
              <Image
                src={image.url}
                alt={`${product.title} ${index + 1}`}
                width={400}
                height={300}
                className="h-48 w-full rounded-none border-2 border-[#1e1b84] bg-gray-100 object-cover shadow-[4px_4px_0_0_#0f172a]"
              />
              <div className="absolute top-2 right-2">
                <span className="rounded-full bg-black bg-opacity-50 px-2 py-1 text-white text-xs">
                  Rank: {image.rank}
                </span>
              </div>
            </div>

            <div className="text-gray-600 text-sm">
              <p>ID: {image.id}</p>
              {image.created_at && (
                <p>
                  Created: <DisplayDate date={image.created_at} />
                </p>
              )}
            </div>

            {image.metadata && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-600">
                  Metadata
                </summary>
                <pre className="mt-1 rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(image.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};