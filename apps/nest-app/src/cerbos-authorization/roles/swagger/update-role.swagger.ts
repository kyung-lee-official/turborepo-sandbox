import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { UpdateRoleDto } from "../dto/update-role.dto";

export class UpdateRole {
  id: string;

  constructor(dto: UpdateRoleDto) {
    this.id = dto.id;
  }
}

export const updateRoleOperationOptions: ApiOperationOptions = {
  summary: "Update a role",
  description: "Update a role",
};

export const updateRoleBodyOptions: ApiBodyOptions = {
  type: UpdateRole,
  examples: {
    "add-bob-to-admin": {
      value: {
        id: "admin",
        members: ["bob"],
      },
    },
  },
};
