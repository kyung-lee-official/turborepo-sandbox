import type { Principal } from "@cerbos/core";

type Role = {
  role: string;
  superRole: string | undefined;
  members: string[];
};

export const mockRoles: Role[] = [
  { role: "admin", superRole: undefined, members: ["Kyung"] },
  {
    role: "super-alpha",
    superRole: "admin",
    members: ["Alice"],
  },
  {
    role: "alpha",
    superRole: "super-alpha",
    members: ["Bob", "someone_00", "someone_01", "someone_02"],
  },
  {
    role: "super-beta",
    superRole: "alpha",
    members: ["Bob"],
  },
  {
    role: "beta",
    superRole: "super-beta",
    members: ["Charlie", "someone_03", "someone_04"],
  },
  {
    role: "super-gamma",
    superRole: "admin",
    members: ["Charlie"],
  },
  {
    role: "gamma",
    superRole: "super-gamma",
    members: ["someone_05", "someone_06"],
  },
];

export function getPrincipal(principalName: string): Principal {
  const roles: Role[] = [];
  for (const r of mockRoles) {
    if (r.members.includes(principalName)) {
      roles.push(r);
    }
  }
  return {
    id: principalName,
    roles: roles.map((role) => role.role),
  };
}

interface Res {
  owner: string;
}

export function getResOwnerRoles(res: Res): string[] {
  const roles = mockRoles.filter((role) => role.members.includes(res.owner));
  return roles.map((role) => role.role);
}

export function checkIsPrincipalSuperRole(
  principal: string,
  rolesOfResOwner: string[],
): boolean {
  /**
   * Check if the principal is in a super role of the roles of the resource owner.
   * @param principal
   * @param subRole
   */
  function checkIfPrincipalInASuperRole(principal: string, subRole: Role) {
    if (subRole.superRole === undefined) {
      return false;
    } else {
      const dbSuperRole = mockRoles.find(
        (role) => role.role === subRole.superRole,
      ) as Role;
      if (dbSuperRole.members.includes(principal)) {
        return true;
      } else {
        return checkIfPrincipalInASuperRole(principal, dbSuperRole);
      }
    }
  }

  const dbRolesOfResOwner = mockRoles.filter((role) =>
    rolesOfResOwner.includes(role.role),
  );
  for (const role of dbRolesOfResOwner) {
    return checkIfPrincipalInASuperRole(principal, role);
  }
  /**
   * because the length of dbRolesOfResOwner is unknown,
   * which means the return statement is possibly unreachable,
   * we need to add a return statement here.
   */
  return false;
}
