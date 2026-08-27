import { describe, expect, test } from "bun:test";
import { evaluateAction } from "./engine.js";
import { AuthzClient } from "./index.js";
import type { PolicyContext } from "./types.js";

function ctx(
  overrides: Partial<PolicyContext> & {
    principal: PolicyContext["principal"];
    resource: PolicyContext["resource"];
  },
): PolicyContext {
  return {
    principal: overrides.principal,
    resource: overrides.resource,
  };
}

describe("members policy", () => {
  test("admin can create members", () => {
    const effect = evaluateAction("internal:members", "create", {
      principal: { id: "u1", roles: ["admin"] },
      resource: { kind: "internal:members", id: "*" },
    });
    expect(effect).toBe("EFFECT_ALLOW");
  });

  test("non-admin cannot create members", () => {
    const effect = evaluateAction("internal:members", "create", {
      principal: { id: "u1", roles: ["default"] },
      resource: { kind: "internal:members", id: "*" },
    });
    expect(effect).toBe("EFFECT_DENY");
  });

  test("cannot delete admin members", () => {
    const effect = evaluateAction("internal:members", "delete", {
      principal: { id: "u1", roles: ["admin"] },
      resource: {
        kind: "internal:members",
        id: "u2",
        attr: { id: "u2", memberRoles: ["admin"] },
      },
    });
    expect(effect).toBe("EFFECT_DENY");
  });

  test("cannot freeze yourself", () => {
    const effect = evaluateAction("internal:members", "freeze", {
      principal: { id: "u1", roles: ["admin"], attr: { id: "u1" } },
      resource: { kind: "internal:members", id: "u1", attr: { id: "u1" } },
    });
    expect(effect).toBe("EFFECT_DENY");
  });

  test("can update own profile", () => {
    const effect = evaluateAction("internal:members", "update-profile", {
      principal: { id: "u1", roles: ["default"], attr: { id: "u1" } },
      resource: { kind: "internal:members", id: "u1", attr: { id: "u1" } },
    });
    expect(effect).toBe("EFFECT_ALLOW");
  });
});

describe("roles policy", () => {
  test("anyone can read roles", () => {
    const effect = evaluateAction("internal:roles", "read", {
      principal: { id: "u1", roles: ["default"] },
      resource: { kind: "internal:roles", id: "role-1" },
    });
    expect(effect).toBe("EFFECT_ALLOW");
  });

  test("only admin can create roles", () => {
    expect(
      evaluateAction("internal:roles", "create", {
        principal: { id: "u1", roles: ["admin"] },
        resource: { kind: "internal:roles", id: "*" },
      }),
    ).toBe("EFFECT_ALLOW");
    expect(
      evaluateAction("internal:roles", "create", {
        principal: { id: "u1", roles: ["default"] },
        resource: { kind: "internal:roles", id: "*" },
      }),
    ).toBe("EFFECT_DENY");
  });
});

describe("performance event policy", () => {
  test("stat owner denied update when score is negative", () => {
    const effect = evaluateAction(
      "internal:applications:performances:event",
      "update",
      {
        principal: { id: "owner-1", roles: [], attr: { id: "owner-1" } },
        resource: {
          kind: "internal:applications:performances:event",
          id: "evt-1",
          attr: { statOwnerId: "owner-1", score: -1 },
        },
      },
    );
    expect(effect).toBe("EFFECT_DENY");
  });

  test("section super role can read event", () => {
    const effect = evaluateAction(
      "internal:applications:performances:event",
      "read",
      {
        principal: { id: "u1", roles: ["section-lead"] },
        resource: {
          kind: "internal:applications:performances:event",
          id: "evt-1",
          attr: {
            statOwnerId: "owner-1",
            sectionSuperRoleIds: ["section-lead"],
          },
        },
      },
    );
    expect(effect).toBe("EFFECT_ALLOW");
  });
});

describe("finance paypal invoice policy", () => {
  test("finance role can access finance paypal invoice", () => {
    const effect = evaluateAction(
      "internal:applications:finance:paypal-invoice",
      "*",
      {
        principal: { id: "u1", roles: ["finance"] },
        resource: {
          kind: "internal:applications:finance:paypal-invoice",
          id: "*",
        },
      },
    );
    expect(effect).toBe("EFFECT_ALLOW");
  });

  test("admin without finance role cannot access finance paypal invoice", () => {
    const effect = evaluateAction(
      "internal:applications:finance:paypal-invoice",
      "*",
      {
        principal: { id: "u1", roles: ["admin"] },
        resource: {
          kind: "internal:applications:finance:paypal-invoice",
          id: "*",
        },
      },
    );
    expect(effect).toBe("EFFECT_DENY");
  });

  test("default role cannot access finance paypal invoice", () => {
    const effect = evaluateAction(
      "internal:applications:finance:paypal-invoice",
      "*",
      {
        principal: { id: "u1", roles: ["default"] },
        resource: {
          kind: "internal:applications:finance:paypal-invoice",
          id: "*",
        },
      },
    );
    expect(effect).toBe("EFFECT_DENY");
  });
});

describe("AuthzClient", () => {
  test("checkResource returns decision with actions and isAllowed", async () => {
    const client = new AuthzClient();
    const decision = await client.checkResource({
      principal: { id: "u1", roles: ["retail-manager"] },
      resource: {
        kind: "internal:applications:retail:sales-data",
        id: "*",
      },
      actions: ["*"],
    });

    expect(decision.isAllowed("*")).toBe(true);
    expect(decision.actions["*"]).toBe("EFFECT_ALLOW");
  });

  test("checkResources batch evaluation", async () => {
    const client = new AuthzClient();
    const decision = await client.checkResources({
      principal: { id: "u1", roles: ["default"] },
      resources: [
        {
          resource: { kind: "internal:roles", id: "r1" },
          actions: ["read"],
        },
        {
          resource: { kind: "internal:roles", id: "r2" },
          actions: ["read"],
        },
      ],
    });

    expect(
      decision.results.every((r) => r.actions.read === "EFFECT_ALLOW"),
    ).toBe(true);
  });
});
