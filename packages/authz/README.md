# @kyung-lee/authz

In-process **policy decision point** (PDP). Evaluate
`(principal, resource, action)` against a registry of resource policies.
Domain-agnostic — you bring the policies, this evaluates them.

- ~6 KB, no external runtime dependencies
- TypeScript-first, ships ESM + CJS + `.d.ts`
- `AuthzClient` (high-level) and `evaluateAction` / `evaluateActions` (low-level)
- Helpers for common predicates (owner checks, role overlap, etc.)

## Install

```sh
bun add @kyung-lee/authz
# or
npm install @kyung-lee/authz
```

Requires Node ≥ 20 or Bun ≥ 1.1.

## Quick start

```ts
import { AuthzClient, type PolicyRegistry } from "@kyung-lee/authz";

const registry: PolicyRegistry = {
  "document": {
    resource: "document",
    rules: [
      { actions: ["read"], effect: "EFFECT_ALLOW", roles: ["*"] },
      { actions: ["write", "delete"], effect: "EFFECT_ALLOW", roles: ["editor"] },
      {
        actions: ["delete"],
        effect: "EFFECT_DENY",
        roles: ["editor"],
        when: (ctx) => ctx.principal.id === ctx.resource.attr?.ownerId
          ? false  // owner cannot delete their own doc; remove or invert as needed
          : true,
      },
    ],
  },
};

const authz = new AuthzClient(registry);

const decision = await authz.checkResource({
  principal: { id: "u1", roles: ["editor"] },
  resource: { kind: "document", id: "doc-1", attr: { ownerId: "u2" } },
  actions: ["write", "delete"],
});

decision.isAllowed("write");   // true
decision.isAllowed("delete");  // depends on the rule above
```

## Concepts

- **`Principal`** — the actor: `{ id, roles, attr? }`.
- **`Resource`** — what's being acted on: `{ kind, id?, attr? }`.
- **`PolicyRule`** — `{ actions, roles, effect, when? }`. `actions` and
  `roles` accept `"*"` as a wildcard. `effect` is `"EFFECT_ALLOW"` or
  `"EFFECT_DENY"`. `when(ctx)` is an optional boolean predicate for ABAC.
- **`ResourcePolicyDefinition`** — `{ resource, rules[] }`.
- **`PolicyRegistry`** — `Record<string, ResourcePolicyDefinition>` keyed by
  `Resource.kind`.

### Evaluation semantics

For a given `(kind, action, ctx)`:

1. If `registry[kind]` is missing → `EFFECT_DENY`.
2. Otherwise iterate rules in order; for each rule that **matches** (action
   and role match, and `when()` if present is true):
   - `EFFECT_DENY` short-circuits to `EFFECT_DENY`.
   - `EFFECT_ALLOW` sets a flag but continues iterating (later `EFFECT_DENY`
     rules can still override).
3. Final: `EFFECT_ALLOW` if any allow matched and no deny did, else
   `EFFECT_DENY`.

This mirrors Cerbos's `DENY > ALLOW` precedence with `ALLOW`-as-default.

## API

### `AuthzClient`

```ts
new AuthzClient(registry: PolicyRegistry);

client.checkResource(request: CheckResourceRequest): Promise<ResourceDecision>;
client.checkResources(request: CheckResourcesRequest): Promise<CheckResourcesDecision>;
```

`ResourceDecision` exposes `.isAllowed(action)` and `.actions: Record<string, Effect>`.

### Helpers

`evaluateAction(registry, kind, action, ctx)` and
`evaluateActions(registry, kind, actions[], ctx)` are exported for cases
where you want to skip the `AuthzClient` wrapper.

Predicate helpers for `when()` rules:

- `principalAttrIdEqualsResourceAttrId(ctx)`
- `principalIdEqualsResourceAttr(ctx, attrField)`
- `principalRolesExistInResourceAttr(ctx, attrField)`
- `resourceAttrIncludes(ctx, attrField, value)`
- `ownerRoleInPrincipalRoles(ctx)`
- `principalIsStatOwner(ctx)`
- `statOwnerUpdatingNegativeScore(ctx)`

## Types

```ts
export type Effect = "EFFECT_ALLOW" | "EFFECT_DENY";

export interface Principal { id: string; roles: string[]; attr?: Record<string, unknown>; }
export interface Resource { kind: string; id?: string; attr?: Record<string, unknown>; }
export interface PolicyContext { principal: { id: string; roles: string[]; attr?: ... }; resource: { kind: string; id?: string; attr?: ... }; }
export interface PolicyRule { name?: string; actions: string[]; effect: "EFFECT_ALLOW" | "EFFECT_DENY"; roles: string[]; when?: (ctx: PolicyContext) => boolean; }
export interface ResourcePolicyDefinition { resource: string; rules: PolicyRule[]; }
export type PolicyRegistry = Record<string, ResourcePolicyDefinition>;
```

## License

MIT