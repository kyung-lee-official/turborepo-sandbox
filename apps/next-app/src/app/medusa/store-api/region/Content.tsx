"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/app/medusa/components/Alert";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { cn } from "@/lib/utils";
import { getRegions, QK_REGION } from "./api";

const Content = () => {
  const regionId = useMIdStore((state) => state.regionId);
  const setRegionId = useMIdStore((state) => state.setRegionId);
  const regionsQuery = useQuery({
    queryKey: [QK_REGION.LIST_REGIONS],
    queryFn: async () => {
      const listRegionsRes = await getRegions();
      return listRegionsRes.regions;
    },
  });

  if (regionsQuery.isPending) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-1/3 bg-stone-200" />
            <div className="h-24 bg-stone-200" />
          </div>
        </PixelSurface>
      </StoreApiScaffold>
    );
  }

  if (regionsQuery.isError) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Regions" variant="error" appearance="pixel">
          {regionsQuery.error instanceof Error
            ? regionsQuery.error.message
            : "Error loading regions"}
        </Alert>
      </StoreApiScaffold>
    );
  }

  return (
    <StoreApiScaffold maxWidth="narrow">
      <PageHeading
        title="Region"
        description="Choose the active region for pricing and cart."
      />
      <ul className="flex flex-col gap-3">
        {regionsQuery.data?.map((region) => {
          const selected = region.id === regionId;
          return (
            <li key={region.id}>
              <PixelSurface
                shadow="sm"
                className={cn(
                  "w-full cursor-pointer p-4 text-left transition-colors",
                  selected
                    ? "border-indigo-700 bg-indigo-50"
                    : "hover:bg-stone-50",
                )}
                onClick={() => setRegionId(region.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setRegionId(region.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="font-bold text-gray-900">{region.name}</span>
                <span className="mt-1 block font-mono text-gray-600 text-xs">
                  {region.id}
                </span>
              </PixelSurface>
            </li>
          );
        })}
      </ul>
    </StoreApiScaffold>
  );
};

export default Content;
