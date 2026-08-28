import { Elysia, t } from "elysia";
import {
  getErrorsJsonl,
  getJob,
  listJobs,
  startProcessing,
} from "./service.ts";
import type { StartProcessingInput } from "./types.ts";

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
