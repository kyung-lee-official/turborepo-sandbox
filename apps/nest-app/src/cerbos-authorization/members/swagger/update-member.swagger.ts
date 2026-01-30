import { PartialType } from "@nestjs/swagger";
import { CreateMember } from "../swagger/create-member.swagger";

export class UpdateMember extends PartialType(CreateMember) {}
