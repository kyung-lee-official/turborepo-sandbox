import { PartialType } from "@nestjs/swagger";
import { CreateMember } from "./create-member.swagger";

export class UpdateMember extends PartialType(CreateMember) {}
