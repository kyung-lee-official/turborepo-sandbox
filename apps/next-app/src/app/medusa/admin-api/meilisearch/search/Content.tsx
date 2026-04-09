"use client";

import Link from "next/link";
import { MeilisearchSearchPanel } from "@/app/medusa/components/MeilisearchSearchPanel";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";

const Content = () => {
  return (
    <div>
      <PageHeading
        title="Search preview"
        description={
          <>
            Run the same hybrid product search as the storefront. Pencil:{" "}
            <span className="font-mono text-xs">
              MeilisearchAdminSearchHub.pen
            </span>
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/medusa/admin-api/meilisearch/tasks">
          <PixelSurface
            shadow="sm"
            className="block p-4 transition-colors hover:bg-stone-50"
          >
            <span className="font-bold text-gray-900">Tasks</span>
            <span className="mt-1 block text-gray-600 text-sm">
              Latest Meilisearch async tasks (limit 3).
            </span>
          </PixelSurface>
        </Link>
        <Link href="/medusa/admin-api/meilisearch/indexes">
          <PixelSurface
            shadow="sm"
            className="block p-4 transition-colors hover:bg-stone-50"
          >
            <span className="font-bold text-gray-900">Indexes</span>
            <span className="mt-1 block text-gray-600 text-sm">
              List, create, documents, embedders.
            </span>
          </PixelSurface>
        </Link>
      </div>

      <div className="mt-10">
        <MeilisearchSearchPanel idleHint="Uses the public store search endpoint (publishable key). Sign in as admin for management routes." />
      </div>
    </div>
  );
};

export default Content;
