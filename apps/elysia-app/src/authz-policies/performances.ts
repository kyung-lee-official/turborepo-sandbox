import {
  ownerRoleInPrincipalRoles,
  principalIdEqualsResourceAttr,
  principalIsStatOwner,
  principalRolesExistInResourceAttr,
  type ResourcePolicyDefinition,
  statOwnerUpdatingNegativeScore,
} from "@kyung.lee/authz";

export const performanceEventPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:performances:event",
  rules: [
    {
      name: "performance-event-create",
      actions: ["create"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIsStatOwner(ctx) ||
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
    {
      name: "performance-event-read",
      actions: ["read"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIsStatOwner(ctx) ||
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds") ||
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
    {
      name: "performance-event-update-and-delete-allow",
      actions: ["update", "delete"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIsStatOwner(ctx) ||
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
    {
      name: "performance-event-update-and-delete-deny",
      actions: ["update", "delete"],
      effect: "EFFECT_DENY",
      roles: ["*"],
      when: statOwnerUpdatingNegativeScore,
    },
  ],
};

export const performanceEventApprovalPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:performances:event:approval",
  rules: [
    {
      actions: ["update"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
  ],
};

export const performanceSectionPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:performances:section",
  rules: [
    {
      name: "performance-section-create",
      actions: ["create"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds"),
    },
    {
      name: "performance-section-create-event",
      actions: ["create-event"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIdEqualsResourceAttr(ctx, "statOwnerId") ||
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
    {
      name: "performance-section-read",
      actions: ["read"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIdEqualsResourceAttr(ctx, "statOwnerId") ||
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds") ||
        principalRolesExistInResourceAttr(ctx, "sectionSuperRoleIds"),
    },
    {
      name: "performance-section-update",
      actions: ["update"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds"),
    },
    {
      name: "performance-section-delete",
      actions: ["delete"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds"),
    },
  ],
};

export const performanceStatPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:performances:stat",
  rules: [
    {
      name: "performance-stat",
      actions: ["create", "copy", "read", "delete"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalIdEqualsResourceAttr(ctx, "statOwnerId") ||
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds"),
    },
    {
      name: "performance-stat-create-section",
      actions: ["create-section"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: (ctx) =>
        principalRolesExistInResourceAttr(ctx, "statOwnerSuperRoleIds"),
    },
  ],
};

export const performanceTemplatePolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:performances:template",
  rules: [
    {
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin"],
    },
    {
      actions: ["read"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: ownerRoleInPrincipalRoles,
    },
  ],
};
