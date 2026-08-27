import type { CheckResourceRequest, CheckResourcesRequest } from "./api.js";
import { evaluateActions } from "./engine.js";
import type { Effect, PolicyRegistry } from "./types.js";

export class ResourceDecision {
  readonly actions: Record<string, Effect>;

  constructor(actions: Record<string, Effect>) {
    this.actions = actions;
  }

  isAllowed(action: string): boolean {
    return this.actions[action] === "EFFECT_ALLOW";
  }
}

export class CheckResourcesDecision {
  readonly results: ResourceDecision[];

  constructor(results: ResourceDecision[]) {
    this.results = results;
  }
}

function toPolicyContext(request: CheckResourceRequest) {
  return {
    principal: {
      id: request.principal.id,
      roles: request.principal.roles,
      attr: request.principal.attr as Record<string, unknown> | undefined,
    },
    resource: {
      kind: request.resource.kind,
      id: request.resource.id,
      attr: request.resource.attr as Record<string, unknown> | undefined,
    },
  };
}

/** In-process policy decision point: evaluates `(principal, resource, actions)` against a registry of policies. */
export class AuthzClient {
  constructor(private readonly registry: PolicyRegistry) {}

  async checkResource(
    request: CheckResourceRequest,
  ): Promise<ResourceDecision> {
    const ctx = toPolicyContext(request);
    const actions = evaluateActions(
      this.registry,
      request.resource.kind,
      request.actions,
      ctx,
    );
    return new ResourceDecision(actions);
  }

  async checkResources(
    request: CheckResourcesRequest,
  ): Promise<CheckResourcesDecision> {
    const results = request.resources.map((entry) => {
      const checkRequest: CheckResourceRequest = {
        principal: request.principal,
        resource: entry.resource,
        actions: entry.actions,
      };
      const ctx = toPolicyContext(checkRequest);
      const actions = evaluateActions(
        this.registry,
        entry.resource.kind,
        entry.actions,
        ctx,
      );
      return new ResourceDecision(actions);
    });

    return new CheckResourcesDecision(results);
  }
}

export type {
  CheckResourceRequest,
  CheckResourcesRequest,
  Principal,
  Resource,
} from "./api.js";
export { evaluateAction, evaluateActions } from "./engine.js";
export {
  ownerRoleInPrincipalRoles,
  principalAttrIdEqualsResourceAttrId,
  principalIdEqualsResourceAttr,
  principalIsStatOwner,
  principalRolesExistInResourceAttr,
  resourceAttrIncludes,
  statOwnerUpdatingNegativeScore,
} from "./helpers.js";
export type {
  Effect,
  PolicyContext,
  PolicyRegistry,
  PolicyRule,
  ResourcePolicyDefinition,
} from "./types.js";
