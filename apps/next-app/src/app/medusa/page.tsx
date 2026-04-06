import Link from "next/link";
import type { ReactNode } from "react";

const Block = ({
  title,
  list,
  children,
}: {
  title: string | ReactNode;
  list: { link: string; text: string | ReactNode }[];
  children?: ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white/50 p-6">
      <h1 className="text-xl">{title}</h1>
      {children}
      <div className="flex flex-col">
        {list.map((item) => {
          return (
            <Link key={item.link} href={item.link} className="hover:underline">
              {item.text}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
export default function Page() {
  return (
    <main className="grid min-h-svh grid-cols-1 gap-6 bg-linear-to-br from-cyan-500/60 to-purple-500/60 p-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <Block
        title="Test"
        list={[{ link: "medusa/test/hello-world", text: "Hello World" }]}
      />
      <Block
        title="Framework"
        list={[
          {
            link: "medusa/framework/events-and-subscribers",
            text: "Events and Subscribers",
          },
        ]}
      />
      <Block
        title="Commerce Modules"
        list={[
          {
            link: "medusa/commerce-modules/api-key",
            text: "API Key",
          },
          { link: "medusa/commerce-modules/auth", text: "Auth" },
          { link: "medusa/commerce-modules/cart", text: "Cart" },
          {
            link: "medusa/commerce-modules/customer",
            text: "Customer",
          },
          {
            link: "medusa/commerce-modules/fulfillment",
            text: "Fulfillment",
          },
          {
            link: "medusa/commerce-modules/inventory",
            text: "Inventory",
          },
          {
            link: "medusa/commerce-modules/product",
            text: "Product",
          },
          {
            link: "medusa/commerce-modules/sales-channel",
            text: "Sales Channel",
          },
          {
            link: "medusa/commerce-modules/stock-location",
            text: "Stock Location",
          },
          { link: "medusa/commerce-modules/user", text: "User" },
        ]}
      />
      <Block
        title="Infrastructure Modules"
        list={[
          {
            link: "medusa/infrastructure-modules/notification",
            text: "Notification",
          },
        ]}
      />
      <Block
        title="Examples"
        list={[
          {
            link: "medusa/examples/restaurant-delivery",
            text: "Restaurant Delivery",
          },
        ]}
      />
      <Block
        title="Store API"
        list={[
          {
            link: "medusa/store-api/auth",
            text: "Auth",
          },
          {
            link: "medusa/store-api/cart",
            text: "Cart",
          },
          {
            link: "medusa/store-api/customer",
            text: "Customer",
          },
          {
            link: "medusa/store-api/order",
            text: "Order",
          },
          {
            link: "medusa/store-api/products",
            text: "Products",
          },
          {
            link: "medusa/store-api/region",
            text: "Region",
          },
        ]}
      />
      <Block
        title="Axios Error Handling for Medusa"
        list={[
          {
            link: "medusa/axios-error-handling-for-medusa",
            text: "axios error handling for medusa",
          },
        ]}
      />
    </main>
  );
}
