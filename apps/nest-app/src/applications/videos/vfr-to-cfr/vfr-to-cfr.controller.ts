import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createVfrToCfrUploadMulterOptions } from "./helpers/upload-multer.factory";
import { VfrToCfrService } from "./vfr-to-cfr.service";
import { VfrToCfrMulterExceptionFilter } from "./vfr-to-cfr-multer.exception-filter";

@Controller("vfr-to-cfr")
export class VfrToCfrController {
  constructor(private readonly vfrToCfrService: VfrToCfrService) {}

  @Get()
  getTemplateInfo() {
    return this.vfrToCfrService.getTemplateInfo();
  }

  @Post("uploaded")
  @UseFilters(VfrToCfrMulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor("video", createVfrToCfrUploadMulterOptions()),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing video file (form field "video")');
    }
    return this.vfrToCfrService.registerUploadedVideo(file);
  }

  @Get("uploaded")
  listUploaded() {
    return this.vfrToCfrService.listUploaded();
  }

  @Get("uploaded/:id")
  getUploaded(@Param("id") id: string) {
    return this.vfrToCfrService.getUploadedDetail(id);
  }

  @Delete("uploaded/:id")
  @HttpCode(204)
  async deleteUploaded(@Param("id") id: string): Promise<void> {
    await this.vfrToCfrService.deleteUploaded(id);
  }

  @Post("uploaded/:id/convert")
  @HttpCode(202)
  convertUploaded(@Param("id") id: string, @Body() body: unknown) {
    return this.vfrToCfrService.startConvert(id, body);
  }

  @Get("output")
  listOutput() {
    return this.vfrToCfrService.listOutput();
  }

  @Get("output/:id")
  getOutput(@Param("id") id: string) {
    return this.vfrToCfrService.getOutputDetail(id);
  }

  @Delete("output/:id")
  @HttpCode(204)
  async deleteOutput(@Param("id") id: string): Promise<void> {
    await this.vfrToCfrService.deleteOutput(id);
  }

  @Get("output/:id/download")
  downloadOutput(@Param("id") id: string): Promise<StreamableFile> {
    return this.vfrToCfrService.downloadOutput(id);
  }
}
