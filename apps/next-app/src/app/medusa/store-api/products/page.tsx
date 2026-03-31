import Image from "next/image";
import Link from "next/link";
import { Alert } from "@/app/medusa/components/Alert";
import { medusaButtonClassName } from "@/app/medusa/components/Button/Button";
import { Card } from "@/app/medusa/components/Card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/currency";
import { getProduts } from "./api";

type ProductFromList = Awaited<
  ReturnType<typeof getProduts>
>["products"][number];

function statusBadgeClass(status: string | undefined) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

const Page = async () => {
  try {
    const data = await getProduts();
    const { products } = data;

    if (products.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-8 font-bold text-3xl text-gray-800">Products</h1>
          <Card className="mx-auto max-w-md space-y-4 p-8 text-center shadow-sm">
            <div className="text-6xl text-gray-400" aria-hidden>
              🛒
            </div>
            <h2 className="font-semibold text-gray-600 text-xl">
              No products found
            </h2>
            <p className="text-gray-500">
              There are no products available at the moment.
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 font-bold text-3xl text-gray-800">Products</h1>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product: ProductFromList) => {
            const price = product.variants?.[0]?.calculated_price;
            const amount = price?.calculated_amount;
            const currencyCode = price?.currency_code || "USD";
            const imageUrl = product.thumbnail || product.images?.[0]?.url;

            return (
              <Card
                key={product.id}
                className={cn(
                  "max-w-none space-y-0 overflow-hidden p-0 shadow-md ring-1 ring-gray-200 transition-shadow duration-300 hover:shadow-lg",
                )}
              >
                <div className="relative h-48 w-full bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.title}
                      width={300}
                      height={200}
                      className="max-h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 font-semibold text-xs",
                        statusBadgeClass(product.status),
                      )}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <h2 className="line-clamp-1 font-semibold text-gray-800 text-lg">
                    {product.title}
                  </h2>

                  {product.subtitle && (
                    <p className="line-clamp-1 text-gray-600 text-sm">
                      {product.subtitle}
                    </p>
                  )}

                  {product.description && (
                    <p className="line-clamp-2 text-gray-500 text-sm">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {amount !== undefined && amount !== null ? (
                      <p className="font-bold text-gray-900 text-xl">
                        {formatCurrency(amount, currencyCode)}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        Price not available
                      </p>
                    )}

                    <Link
                      href={`/medusa/store-api/products/${product.id}`}
                      className={cn(
                        medusaButtonClassName("primary"),
                        "inline-flex w-auto shrink-0 no-underline",
                      )}
                    >
                      View Details
                    </Link>
                  </div>

                  <div className="flex justify-between border-gray-100 border-t pt-4 text-gray-500 text-xs">
                    <span className="truncate">ID: {product.id}</span>
                    {product.variants && (
                      <span className="shrink-0">
                        {product.variants.length} variant(s)
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert
          title="Error loading products"
          variant="error"
          className="mx-auto max-w-lg"
        >
          <p>
            There was a problem loading the products. Please try again later.
          </p>
        </Alert>
      </div>
    );
  }
};

export default Page;
