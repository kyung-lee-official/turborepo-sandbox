import Image from "next/image";
import Link from "next/link";
import { Alert } from "@/app/medusa/components/Alert";
import { medusaButtonClassName } from "@/app/medusa/components/Button/Button";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/currency";
import { getProduts } from "./api";

type ProductFromList = Awaited<
  ReturnType<typeof getProduts>
>["products"][number];

function statusBadgeClass(status: string | undefined) {
  switch (status) {
    case "published":
      return "border border-green-800 bg-green-100 text-green-900 shadow-[2px_2px_0_0_#14532d]";
    case "draft":
      return "border border-amber-800 bg-amber-100 text-amber-950 shadow-[2px_2px_0_0_#78350f]";
    default:
      return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
  }
}

const Page = async () => {
  try {
    const data = await getProduts();
    const { products } = data;

    if (products.length === 0) {
      return (
        <StoreApiScaffold>
          <PageHeading title="Products" />
          <Card variant="pixel" className="mx-auto max-w-md space-y-4 p-8 text-center">
            <div className="text-5xl text-gray-500" aria-hidden>
              🛒
            </div>
            <h2 className="font-bold text-gray-800 text-xl">No products found</h2>
            <p className="text-gray-600">
              There are no products available at the moment.
            </p>
          </Card>
        </StoreApiScaffold>
      );
    }

    return (
      <StoreApiScaffold>
        <PageHeading
          title="Products"
          description="Browse the catalog and open a product for details."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product: ProductFromList) => {
            const price = product.variants?.[0]?.calculated_price;
            const amount = price?.calculated_amount;
            const currencyCode = price?.currency_code || "USD";
            const imageUrl = product.thumbnail || product.images?.[0]?.url;

            return (
              <Card
                key={product.id}
                variant="pixel"
                className={cn(
                  "max-w-none space-y-0 overflow-hidden p-0 transition-shadow duration-200",
                  "hover:shadow-[12px_12px_0_0_#0f172a]",
                )}
              >
                <div className="relative h-48 w-full bg-stone-200">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.title}
                      width={300}
                      height={200}
                      className="max-h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span
                      className={cn(
                        "rounded-none px-2 py-1 font-semibold text-xs",
                        statusBadgeClass(product.status),
                      )}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <h2 className="line-clamp-1 font-bold text-gray-900 text-lg">
                    {product.title}
                  </h2>

                  {product.subtitle && (
                    <p className="line-clamp-1 text-gray-600 text-sm">
                      {product.subtitle}
                    </p>
                  )}

                  {product.description && (
                    <p className="line-clamp-2 text-gray-600 text-sm">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {amount !== undefined && amount !== null ? (
                      <p className="font-bold text-gray-900 text-xl">
                        {formatCurrency(amount, currencyCode)}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-sm">Price not available</p>
                    )}

                    <Link
                      href={`/medusa/store-api/products/${product.id}`}
                      className={cn(
                        medusaButtonClassName("primary", {
                          fullWidth: false,
                          size: "compact",
                        }),
                        "inline-flex shrink-0 no-underline",
                      )}
                    >
                      View details
                    </Link>
                  </div>

                  <div className="flex justify-between border-[#1e1b84] border-t-2 pt-4 text-gray-600 text-xs">
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
      </StoreApiScaffold>
    );
  } catch (error) {
    console.error(error);
    return (
      <StoreApiScaffold>
        <Alert
          title="Error loading products"
          variant="error"
          appearance="pixel"
          className="mx-auto max-w-lg"
        >
          <p>
            There was a problem loading the products. Please try again later.
          </p>
        </Alert>
      </StoreApiScaffold>
    );
  }
};

export default Page;
