"use client";

import Link from "next/link";
import { medusaButtonClassName } from "@/app/medusa/components/Button/Button";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { cn } from "@/lib/utils";

const routes = [
  { href: "/medusa/store-api/products", label: "Products" },
  { href: "/medusa/store-api/cart", label: "Cart" },
  { href: "/medusa/store-api/region", label: "Region" },
  { href: "/medusa/store-api/auth", label: "Auth" },
  { href: "/medusa/store-api/customer", label: "Customer" },
  { href: "/medusa/store-api/order", label: "Order" },
] as const;

export const Content = () => {
  return (
    <StoreApiScaffold>
      <PageHeading
        title="Store API"
        description="Medusa.js store routes — pick a section to explore."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map(({ href, label }) => (
          <li key={href}>
            <Card
              variant="pixel"
              className="flex h-full max-w-none flex-col justify-between p-5"
            >
              <span className="font-semibold text-gray-900">{label}</span>
              <Link
                href={href}
                className={cn(
                  medusaButtonClassName("primary", {
                    fullWidth: true,
                    size: "compact",
                  }),
                  "mt-4 inline-flex no-underline",
                )}
              >
                Open
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </StoreApiScaffold>
  );
};
