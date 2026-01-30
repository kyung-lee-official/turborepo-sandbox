import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UsePipes,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type CreateMemberDto, createMemberSchema } from "./dto/create-member.dto";
import type { UpdateMemberDto } from "./dto/update-member.dto";
import type { MembersService } from "./members.service";
import { CreateMemberPipe } from "./pipes/create-member.pipe";
import {
	createMemberBodyOptions,
	createMemberOperationOptions,
} from "./swagger/create-member.swagger";
import { findMembersOperationOptions } from "./swagger/find-members.swagger";

@ApiTags("Members")
@Controller("members")
export class MembersController {
	constructor(private readonly membersService: MembersService) {}

	@ApiOperation(createMemberOperationOptions)
	@ApiBody(createMemberBodyOptions)
	@UsePipes(new CreateMemberPipe(createMemberSchema))
	@Post()
	async create(@Body() createMemberDto: CreateMemberDto) {
		return await this.membersService.create(createMemberDto);
	}

	// @ApiBearerAuth()
	@ApiOperation(findMembersOperationOptions)
	// @UseGuards(JwtGuard, FindAllCerbosGuard)
	@Get()
	async findAll() {
		return await this.membersService.findAll();
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.membersService.findOne(+id);
	}

	@Patch(":id")
	update(@Param("id") id: string, @Body() updateMemberDto: UpdateMemberDto) {
		return this.membersService.update(+id, updateMemberDto);
	}

	// @UseGuards(CerbosGuard)
	@Delete(":id")
	async remove(@Param("id") id: string) {
		return await this.membersService.remove(id);
	}
}
