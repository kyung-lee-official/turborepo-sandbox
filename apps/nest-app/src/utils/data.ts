import type { Principal } from "@cerbos/core";

export function exclude<
  Entity extends ArrayLike<unknown>,
  Key extends keyof Entity,
>(member: Entity, keys: Key[]): Omit<Entity, Key> {
  const entries = Object.entries(member).filter(([key]) => {
    return !keys.includes(key as Key);
  });
  const object = Object.fromEntries(entries);
  return object as Omit<Entity, Key>;
}

export function excludePassword(object: any) {
  for (const key in object) {
    if (key === "password") {
      delete object.password;
    }
    if (key === "members") {
      for (const member of object.members) {
        excludePassword(member);
      }
    }
    if (typeof object[key] === "object") {
      excludePassword(object[key]);
    }
  }
  return object;
}

export function getCerbosPrincipal(requester: any): Principal {
  return {
    id: requester.id,
    roles: requester.memberRoles.map((role) => role.id),
    attr: {
      ...requester,
      memberRoles: requester.memberRoles.map((role) => {
        return {
          id: role.id,
          name: role.name,
          superRoleId: role.superRoleId,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
        };
      }),
      createdAt: requester.createdAt.toISOString(),
      updatedAt: requester.updatedAt.toISOString(),
    },
  };
}
