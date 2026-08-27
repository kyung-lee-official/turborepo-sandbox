import { describe, expect, test } from "bun:test";
import { AuthzClient } from "./index.js";
import type { PolicyContext, PolicyRegistry } from "./types.js";

const registry: PolicyRegistry = {
  "test:thing": {
    resource: "test:thing",
    rules: [
      { actions: ["read"], effect: "EFFECT_ALLOW", roles: ["*"] },
      { actions: ["write"], effect: "EFFECT_ALLOW", roles: ["admin"] },
      { actions: ["write"], effect: "EFFECT_DENY", roles: ["banned"] },
      {
        actions: ["delete"],
        effect: "EFFECT_ALLOW",
        roles: ["user"],
        when: (ctx) => ctx.principal.id === ctx.resource.attr?.ownerId,
      },
    ],
  },
  "test:absent": undefined as never,
};

const adminCtx: PolicyContext = {
  principal: { id: "u1", roles: ["admin"] },
  resource: { kind: "test:thing", id: "r1" },
};

describe("AuthzClient", () => {
  test("allows read for any role", async () => {
    const client = new AuthzClient(registry);
    const d = await client.checkResource({
      principal: { id: "u1", roles: ["guest"] },
      resource: { kind: "test:thing", id: "r1" },
      actions: ["read"],
    });
    expect(d.isAllowed("read")).toBe(true);
  });

  test("denies when resource kind has no policy", async () => {
    const client = new AuthzClient(registry);
    const d = await client.checkResource({
      principal: { id: "u1", roles: ["admin"] },
      resource: { kind: "test:absent", id: "r1" },
      actions: ["read"],
    });
    expect(d.isAllowed("read")).toBe(false);
  });

  test("deny rule wins over allow for the same action", async () => {
    const client = new AuthzClient(registry);
    const d = await client.checkResource({
      principal: { id: "u1", roles: ["admin", "banned"] },
      resource: { kind: "test:thing", id: "r1" },
      actions: ["write"],
    });
    expect(d.isAllowed("write")).toBe(false);
  });

  test("when() predicate gates the rule", async () => {
    const client = new AuthzClient(registry);
    const owner = await client.checkResource({
      principal: { id: "u1", roles: ["user"] },
      resource: { kind: "test:thing", id: "r1", attr: { ownerId: "u1" } },
      actions: ["delete"],
    });
    const stranger = await client.checkResource({
      principal: { id: "u2", roles: ["user"] },
      resource: { kind: "test:thing", id: "r1", attr: { ownerId: "u1" } },
      actions: ["delete"],
    });
    expect(owner.isAllowed("delete")).toBe(true);
    expect(stranger.isAllowed("delete")).toBe(false);
  });

  test("checkResources returns one decision per resource", async () => {
    const client = new AuthzClient(registry);
    const out = await client.checkResources({
      principal: { id: "u1", roles: ["user"] },
      resources: [
        {
          resource: { kind: "test:thing", id: "r1", attr: { ownerId: "u1" } },
          actions: ["delete"],
        },
        {
          resource: { kind: "test:thing", id: "r2", attr: { ownerId: "u9" } },
          actions: ["delete"],
        },
      ],
    });
    expect(out.results).toHaveLength(2);
    expect(out.results[0].isAllowed("delete")).toBe(true);
    expect(out.results[1].isAllowed("delete")).toBe(false);
  });
});

describe("principal ctx passthrough", () => {
  test("attr flows into ctx for when() predicates", async () => {
    const client = new AuthzClient(registry);
    const d = await client.checkResource({
      principal: { id: "u1", roles: ["user"], attr: { foo: "bar" } },
      resource: { kind: "test:thing", id: "r1", attr: { ownerId: "u1" } },
      actions: ["delete"],
    });
    expect(d.isAllowed("delete")).toBe(true);
  });
});
