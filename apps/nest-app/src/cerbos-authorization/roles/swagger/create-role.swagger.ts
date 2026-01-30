import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { CreateRoleDto } from "../dto/create-role.dto";

export class CreateRole {
  id: string;

  constructor(dto: CreateRoleDto) {
    this.id = dto.id;
  }
}

export const createRoleOperationOptions: ApiOperationOptions = {
  summary: "Create a new role",
  description: "Create a new role",
};

export const createRoleBodyOptions: ApiBodyOptions = {
  type: CreateRole,
  examples: {
    admin: {
      value: {
        id: "Admin",
      },
    },
    "chief-hr": {
      value: {
        id: "chief-hr",
      },
    },
  },
};
