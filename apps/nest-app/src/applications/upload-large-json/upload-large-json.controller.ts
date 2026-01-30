import {
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import type { UploadLargeJsonService } from "./upload-large-json.service";

@ApiTags("Upload Large Json")
@Controller("applications/upload-large-json")
export class UploadLargeJsonController {
	constructor(
		private readonly uploadLargeJsonService: UploadLargeJsonService
	) {}

	@Post()
	@UseInterceptors(
		FileInterceptor("data")
	) /* intercept the data from FormData */
	async create(@UploadedFile() data: Express.Multer.File) {
		return this.uploadLargeJsonService.create(data);
	}

	@Get()
	findAll() {
		return this.uploadLargeJsonService.findAll();
	}

	@Delete(":batchId")
	async remove(@Param("batchId", ParseIntPipe) batchId: number) {
		return await this.uploadLargeJsonService.remove(batchId);
	}
}
