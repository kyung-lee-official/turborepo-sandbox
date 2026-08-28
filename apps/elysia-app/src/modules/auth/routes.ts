import { Elysia, status, t } from "elysia";
import { SignJWT } from "jose";
import { getPrisma } from "../../shared/db.ts";

const SECRET = process.env.SECRET ?? "";
const secretKey = new TextEncoder().encode(SECRET);

const idBody = t.Object({ id: t.String() });

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/sign-up",
    async ({ body }) => {
      const id = body.id.toLowerCase();
      return await getPrisma().member.create({ data: { id } });
    },
    { body: idBody },
  )
  .post(
    "/sign-in",
    async ({ body }) => {
      const id = body.id.toLowerCase();
      const member = await getPrisma().member.findUnique({ where: { id } });
      if (!member) {
        return status(404, { error: `Member with id ${id} not found` });
      }
      const jwt = await new SignJWT({ id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("60m")
        .sign(secretKey);
      return { jwt };
    },
    { body: idBody },
  );
