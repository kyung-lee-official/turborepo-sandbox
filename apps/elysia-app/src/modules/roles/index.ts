import { Elysia, status, t } from "elysia";
import { forbidden, isActionAllowed } from "../../shared/auth.ts";
import { getPrisma } from "../../shared/db.ts";
import { auth } from "../auth/index.ts";

const idParam = t.Object({ id: t.String() });
const createRoleBody = t.Object({ id: t.String() });
const updateRoleBody = t.Object({
  id: t.String(),
  members: t.Array(t.String()),
});

export const roleRoutes = new Elysia({ prefix: "/roles" })
  .use(auth)
  .post(
    "/",
    async ({ body, principal }) => {
      if (
        !(await isActionAllowed(principal, "internal:roles", "create", body.id))
      ) {
        return forbidden();
      }
      const id = body.id.toLowerCase();
      return await getPrisma().role.create({ data: { id } });
    },
    { requireUser: true, body: createRoleBody },
  )
  .get(
    "/",
    async ({ principal }) => {
      if (!(await isActionAllowed(principal, "internal:roles", "read"))) {
        return forbidden();
      }
      return await getPrisma().role.findMany({ include: { members: true } });
    },
    { requireUser: true },
  )
  .get(
    "/:id",
    async ({ params, principal }) => {
      if (
        !(await isActionAllowed(principal, "internal:roles", "read", params.id))
      ) {
        return forbidden();
      }
      const role = await getPrisma().role.findUnique({
        where: { id: params.id },
      });
      if (!role) {
        return status(404, { error: `Role with id ${params.id} not found` });
      }
      return role;
    },
    { requireUser: true, params: idParam },
  )
  .patch(
    "/",
    async ({ body, principal }) => {
      if (
        !(await isActionAllowed(principal, "internal:roles", "update", body.id))
      ) {
        return forbidden();
      }
      return await getPrisma().role.update({
        where: { id: body.id.toLowerCase() },
        data: {
          members: {
            connect: body.members.map((id) => ({ id: id.toLowerCase() })),
          },
        },
      });
    },
    { requireUser: true, body: updateRoleBody },
  )
  .delete(
    "/:id",
    async ({ params, principal }) => {
      if (
        !(await isActionAllowed(
          principal,
          "internal:roles",
          "delete",
          params.id,
        ))
      ) {
        return forbidden();
      }
      return await getPrisma().role.delete({ where: { id: params.id } });
    },
    { requireUser: true, params: idParam },
  );
