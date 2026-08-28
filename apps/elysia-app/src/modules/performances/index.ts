import { Elysia, status, t } from "elysia";
import { getPrisma } from "../../shared/db.ts";
import { auth } from "../auth/index.ts";

const createBody = t.Object({
  score: t.Integer({ minimum: 0, maximum: 10 }),
  ownerId: t.String(),
});

const idParam = t.Object({ id: t.String() });

function parseIntStrict(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && String(n) === value ? n : null;
}

export const performanceRoutes = new Elysia({ prefix: "/performances" })
  .use(auth)
  .post(
    "/",
    async ({ body }) => {
      return await getPrisma().performance.create({
        data: {
          score: body.score,
          ownerId: body.ownerId.toLowerCase(),
        },
      });
    },
    { requireUser: true, body: createBody },
  )
  .get(
    "/",
    async () => {
      return await getPrisma().performance.findMany({
        include: {
          owner: { include: { roles: true } },
        },
      });
    },
    { requireUser: true },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const id = parseIntStrict(params.id);
      if (id === null) {
        return status(400, { error: `Invalid performance id: ${params.id}` });
      }
      const performance = await getPrisma().performance.findUnique({
        where: { id },
      });
      if (!performance) {
        return status(404, {
          error: `Performance with id ${params.id} not found`,
        });
      }
      return performance;
    },
    { requireUser: true, params: idParam },
  )
  .delete(
    "/:id",
    async ({ params }) => {
      const id = parseIntStrict(params.id);
      if (id === null) {
        return status(400, { error: `Invalid performance id: ${params.id}` });
      }
      return await getPrisma().performance.delete({ where: { id } });
    },
    { requireUser: true, params: idParam },
  );
