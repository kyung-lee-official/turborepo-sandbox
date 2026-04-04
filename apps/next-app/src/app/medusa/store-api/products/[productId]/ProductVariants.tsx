import { StoreProduct } from "@medusajs/types";
import { Card } from "@/app/medusa/components/Card";
import { Variant } from "./Variant";

interface ProductVariantsProps {
  product: StoreProduct;
}

export const ProductVariants = ({ product }: ProductVariantsProps) => {
  if (!product.variants || product.variants.length === 0) {
    return null;
  }

  return (
    <Card variant="pixel" className="max-w-none space-y-4 p-6">
      <h2 className="mb-4 font-bold text-gray-900 text-xl">Variants</h2>
      <div className="space-y-6">
        {product.variants.map((variant) => (
          <Variant key={variant.id} variant={variant} />
        ))}
      </div>
    </Card>
  );
};
