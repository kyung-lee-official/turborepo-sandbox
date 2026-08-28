import { Elysia, status, t } from "elysia";
import { forbidden, isActionAllowed } from "../../shared/auth.ts";
import { getPrisma } from "../../shared/db.ts";
import { auth } from "../auth/index.ts";

const idParam = t.Object({ id: t.String() });
const idBody = t.Object({ id: t.String() });
const partialIdBody = t.Partial(t.Object({ id: t.String() }));

export const memberRoutes = new Elysia({ prefix: "/members" })
  .use(auth)
  .post(
    "/",
    async ({ body, principal }) => {
      if (
        !(await isActionAllowed(
          principal,
          "internal:members",
          "create",
          body.id,
        ))
      ) {
        return forbidden();
      }
      const id = body.id.toLowerCase();
      return await getPrisma().member.create({ data: { id } });
    },
    { requireUser: true, body: idBody },
  )
  .get(
    "/",
    async ({ principal }) => {
      if (!(await isActionAllowed(principal, "internal:members", "read"))) {
        return forbidden();
      }
      return await getPrisma().member.findMany({ include: { roles: true } });
    },
    { requireUser: true },
  )
  .get(
    "/:id",
    async ({ params, principal }) => {
      if (
        !(await isActionAllowed(
          principal,
          "internal:members",
          "read",
          params.id,
        ))
      ) {
        return forbidden();
      }
      const member = await getPrisma().member.findUnique({
        where: { id: params.id },
        include: { roles: true },
      });
      if (!member) {
        return status(404, { error: `Member with id ${params.id} not found` });
      }
      return member;
    },
    { requireUser: true, params: idParam },
  )
  .patch(
    "/:id",
    async ({ params, body, principal }) => {
      if (
        !(await isActionAllowed(
          principal,
          "internal:members",
          "update",
          params.id,
        ))
      ) {
        return forbidden();
      }
      const data: { id?: string } = {};
      if (body.id !== undefined) data.id = body.id.toLowerCase();
      return await getPrisma().member.update({
        where: { id: params.id },
        data,
      });
    },
    { requireUser: true, params: idParam, body: partialIdBody },
  )
  .delete(
    "/:id",
    async ({ params, principal }) => {
      const target = await getPrisma().member.findUnique({
        where: { id: params.id },
        include: { roles: true },
      });
      if (!target) {
        return status(404, { error: `Member with id ${params.id} not found` });
      }
      const allowed = await isActionAllowed(
        principal,
        "internal:members",
        "delete",
        params.id,
        { memberRoles: target.roles.map((r) => r.id) },
      );
      if (!allowed) return forbidden();
      return await getPrisma().member.delete({ where: { id: params.id } });
    },
    { requireUser: true, params: idParam },
  );
