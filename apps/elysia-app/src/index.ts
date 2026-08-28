import { cors } from "@elysiajs/cors";
import { Elysia, status } from "elysia";
import { authRoutes } from "./modules/auth/routes.ts";
import { health } from "./modules/health/index.ts";
import { memberRoutes } from "./modules/members/index.ts";
import { performanceRoutes } from "./modules/performances/index.ts";
import { roleRoutes } from "./modules/roles/index.ts";
import { serverPort } from "./shared/config.ts";
import { closeDb } from "./shared/db.ts";

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .onError(({ code, error }) => {
    if (code === "PARSE") {
      return status(400, { error: "Invalid JSON body" });
    }
    if (code === "NOT_FOUND") {
      return status(404, { error: "Not found" });
    }
    if (code === "VALIDATION") {
      return status(400, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
  .use(health)
  .use(authRoutes)
  .use(memberRoutes)
  .use(roleRoutes)
  .use(performanceRoutes)
  .listen(serverPort());

const shutdown = async () => {
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`elysia-app listening on http://localhost:${app.server?.port}`);

export type App = typeof app;
export default app;
