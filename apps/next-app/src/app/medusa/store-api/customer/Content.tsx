"use client";

import { useMutation } from "@tanstack/react-query";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { getMe } from "./api";

export const Content = () => {
  const getMeMutation = useMutation({
    mutationFn: async () => {
      return await getMe();
    },
    onSuccess: async (data) => {
      console.log("Me data:", data);
    },
    onError: (error) => {
      console.error("Failed to get me:", error);
    },
  });

  return (
    <StoreApiScaffold maxWidth="narrow">
      <PageHeading
        title="Customer profile"
        description="Fetch the current customer with the session token."
      />

      <details className="group mb-8">
        <summary className="cursor-pointer font-mono text-gray-600 text-sm underline decoration-[#1e1b84] decoration-2 underline-offset-2">
          Raw response (debug)
        </summary>
        <PixelSurface className="mt-3 overflow-auto p-4" shadow="sm">
          <pre className="font-mono text-xs text-gray-800">
            {JSON.stringify(getMeMutation.data, null, 2)}
          </pre>
        </PixelSurface>
      </details>

      <Card variant="pixel" className="max-w-md">
        <h2 className="text-center font-bold text-2xl text-gray-900">
          GET /customers/me
        </h2>
        <Button
          type="button"
          onClick={() => getMeMutation.mutate()}
          disabled={getMeMutation.isPending}
        >
          {getMeMutation.isPending ? "Loading…" : "Load profile"}
        </Button>

        {getMeMutation.isError && (
          <Alert title="Request failed" variant="error" appearance="pixel">
            {(getMeMutation.error as Error).message}
          </Alert>
        )}

        {getMeMutation.isSuccess && (
          <Alert title="Success" variant="success" appearance="pixel">
            Profile loaded.
          </Alert>
        )}
      </Card>
    </StoreApiScaffold>
  );
};
