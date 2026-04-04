import type { StoreProduct } from "@medusajs/types";
import { Card } from "@/app/medusa/components/Card";
import { DisplayDate } from "./DisplayDate";

interface ProductOptionsProps {
  product: StoreProduct;
}

export const ProductOptions = ({ product }: ProductOptionsProps) => {
  if (!product.options || product.options.length === 0) {
    return null;
  }

  return (
    <Card variant="pixel" className="max-w-none space-y-4 p-6">
      <h2 className="mb-4 font-bold text-gray-900 text-xl">Product options</h2>
      <div className="space-y-4">
        {product.options.map((option) => (
          <div
            key={option.id}
            className="border-[#1e1b84] border-b-2 pb-4 last:border-b-0"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">{option.title}</h3>
              <span className="text-gray-500 text-sm">ID: {option.id}</span>
            </div>

            {option.values && option.values.length > 0 && (
              <div className="space-y-2">
                <span className="text-gray-600 text-sm">Values:</span>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <div key={value.id} className="group relative">
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-800 text-sm">
                        {value.value}
                      </span>
                      <div className="-translate-x-1/2 absolute bottom-full left-1/2 z-10 mb-2 hidden rounded bg-black px-2 py-1 text-white text-xs group-hover:block">
                        ID: {value.id}
                        {value.created_at && (
                          <>
                            <br />
                            Created: <DisplayDate date={value.created_at} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {option.metadata && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-gray-600">
                  Option Metadata
                </summary>
                <pre className="mt-1 rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(option.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};