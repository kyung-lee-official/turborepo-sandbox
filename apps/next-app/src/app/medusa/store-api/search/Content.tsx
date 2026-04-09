"use client";

import { MeilisearchSearchPanel } from "@/app/medusa/components/MeilisearchSearchPanel";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";

const Content = () => {
  return (
    <StoreApiScaffold>
      <PageHeading
        title="Product search"
        description={
          <>
            Store Meilisearch hybrid search. Design reference:{" "}
            <span className="font-mono text-xs">SearchPage.pen</span>
          </>
        }
      />
      <div className="mt-8">
        <MeilisearchSearchPanel />
      </div>
    </StoreApiScaffold>
  );
};

export default Content;
