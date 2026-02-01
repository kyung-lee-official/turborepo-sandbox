"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { queryClient } from "../data-fetching/tanstack-query/queryClient";

const DynamicHeader = dynamic(() => import("./Header"), {
  ssr: false,
});

type MedusaWrapperProps = {
  regionId: string | undefined;
  salesChannelId: string | undefined;
  customerId: string | undefined;
  children: ReactNode;
};

export const MedusaWrapper = (props: MedusaWrapperProps) => {
  const { children, regionId, salesChannelId, customerId } = props;
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicHeader
        regionId={regionId}
        salesChannelId={salesChannelId}
        customerId={customerId}
      />
      {children}
    </QueryClientProvider>
  );
};
