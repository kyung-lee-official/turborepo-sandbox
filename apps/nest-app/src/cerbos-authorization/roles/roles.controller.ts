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
import { type CreateRoleDto, createRoleSchema } from "./dto/create-role.dto";
import { type UpdateRoleDto, updateRoleSchema } from "./dto/update-role.dto";
import { CreateRolePipe } from "./pipes/create-role.pipe";
import { UpdateRolePipe } from "./pipes/update-role.pipe";
import type { RolesService } from "./roles.service";
import {
	createRoleBodyOptions,
	createRoleOperationOptions,
} from "./swagger/create-role.swagger";
import { findRolesOperationOptions } from "./swagger/find-roles.swagger";
import {
	updateRoleBodyOptions,
	updateRoleOperationOptions,
} from "./swagger/update-role.swagger";

@ApiTags("Roles")
@Controller("roles")
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@ApiOperation(createRoleOperationOptions)
	@ApiBody(createRoleBodyOptions)
	@UsePipes(new CreateRolePipe(createRoleSchema))
	@Post()
	async create(@Body() createRoleDto: CreateRoleDto) {
		return await this.rolesService.create(createRoleDto);
	}

	@ApiOperation(findRolesOperationOptions)
	@Get()
	async findAll() {
		return this.rolesService.findAll();
	}

	@Get(":id")
	async findOne(@Param("id") id: string) {
		return this.rolesService.findOne(id);
	}

	@ApiOperation(updateRoleOperationOptions)
	@ApiBody(updateRoleBodyOptions)
	@UsePipes(new UpdateRolePipe(updateRoleSchema))
	@Patch()
	async update(@Body() updateRoleDto: UpdateRoleDto) {
		return await this.rolesService.update(updateRoleDto);
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		return await this.rolesService.remove(id);
	}
}
