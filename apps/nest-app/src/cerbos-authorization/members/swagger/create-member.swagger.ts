import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { CreateMemberDto } from "../dto/create-member.dto";

export class CreateMember {
  id: string;

  constructor(dto: CreateMemberDto) {
    this.id = dto.id;
  }
}

export const createMemberOperationOptions: ApiOperationOptions = {
  summary: "Create a new member",
  description: "Create a new member",
};

export const createMemberBodyOptions: ApiBodyOptions = {
  type: CreateMember,
  examples: {
    Bob: {
      value: {
        id: "Bob",
      },
    },
  },
};
