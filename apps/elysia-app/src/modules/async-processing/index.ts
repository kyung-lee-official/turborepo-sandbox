import { Elysia, t } from "elysia";
import {
  SALES_IMPORT_DOMAIN_KIND,
  salesImportSourceSpecs,
} from "../sales-import/constants.ts";
import { VFR_TO_CFR_DOMAIN_KIND } from "../vfr-to-cfr/constants.ts";
import { domainRegistry } from "./domain-registry.ts";
import { asyncGeneratePdfDomainRunner } from "./domain-runners/async-generate-pdf.ts";
import { salesReportDomainRunner } from "./domain-runners/sales-report.ts";
import {
  getErrorsJsonl,
  getJob,
  listJobs,
  startProcessing,
} from "./service.ts";
import { streamJobEventsOrThrow } from "./sse.ts";
import type { StartProcessingInput } from "./types.ts";

domainRegistry.register(VFR_TO_CFR_DOMAIN_KIND, {
  domainRunner: asyncGeneratePdfDomainRunner,
  sourceSpecs: [{ sourceId: "video", required: true }],
  lockPolicy: { type: "none" },
});

domainRegistry.register(SALES_IMPORT_DOMAIN_KIND, {
  domainRunner: salesReportDomainRunner,
  sourceSpecs: [...salesImportSourceSpecs],
  lockPolicy: { type: "none" },
});

export const asyncProcessingRoutes = new Elysia()
  .get(
    "/jobs",
    async ({ query }) => {
      return await listJobs({
        phase: typeof query.phase === "string" ? query.phase : undefined,
        domainKind:
          typeof query.domainKind === "string" ? query.domainKind : undefined,
        limit: typeof query.limit === "string" ? query.limit : undefined,
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
      });
    },
    {
      query: t.Object({
        phase: t.Optional(t.String()),
        domainKind: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
      }),
    },
  )
  .get("/jobs/:jobId", async ({ params }) => {
    return await getJob(params.jobId);
  })
  .get("/jobs/:jobId/events", async ({ params }) => {
    return await streamJobEventsOrThrow(params.jobId);
  })
  .get("/jobs/:jobId/errors", async ({ params, set }) => {
    const body = await getErrorsJsonl(params.jobId);
    set.headers = {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="validation-errors-${params.jobId}.jsonl"`,
    };
    return body;
  })
  .post(
    "/applications/async-processing/start",
    async ({ body, set }) => {
      const result = await startProcessing(
        body as unknown as StartProcessingInput,
      );
      set.status = 202;
      return result;
    },
    {
      body: t.Object({
        domainKind: t.String(),
        sources: t.Record(t.String(), t.Any()),
        context: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  );
