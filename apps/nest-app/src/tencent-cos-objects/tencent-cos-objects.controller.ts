import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type * as COS from "cos-nodejs-sdk-v5";
import type { CredentialData } from "qcloud-cos-sts";
import type { UpdateTencentCosObjectDto } from "./dto/update-tencent-cos-object.dto";
import type { TencentCosObjectsService } from "./tencent-cos-objects.service";

@Controller("tencent-cos-objects")
export class TencentCosObjectsController {
	constructor(
		private readonly tencentCosObjectsService: TencentCosObjectsService
	) {}

	@Get("temporary-credential")
	async getTemporaryCredential(): Promise<CredentialData> {
		return this.tencentCosObjectsService.getTemporaryCredential();
	}

	@Put("uploadFileToCos")
	@UseInterceptors(FileInterceptor("file"))
	async uploadFileToCos(
		@UploadedFile() file: Express.Multer.File
	): Promise<COS.PutObjectResult> {
		return this.tencentCosObjectsService.uploadFileToCos(file);
	}

	@Get()
	findAll() {
		return this.tencentCosObjectsService.findAll();
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.tencentCosObjectsService.findOne(+id);
	}

	@Patch(":id")
	update(
		@Param("id") id: string,
		@Body() updateTencentCosObjectDto: UpdateTencentCosObjectDto
	) {
		return this.tencentCosObjectsService.update(
			+id,
			updateTencentCosObjectDto
		);
	}

	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.tencentCosObjectsService.remove(+id);
	}
}
