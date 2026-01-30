import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  AnyFilesInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation } from "@nestjs/swagger";
import type { Response } from "express";
import z from "zod";
import { ZodValidationPipe } from "@/overview/pipes/zod-validation.pipe";
import type { CreateTechniqueDto } from "./dto/create-technique.dto";
import type { UpdateTechniqueDto } from "./dto/update-technique.dto";
import {
  uploadFileApiBodyOptions,
  uploadFileApiOperationOptions,
} from "./swagger/upload-file.swagger";
import { uploadFilesApiOperationOptions } from "./swagger/upload-files.swagger";
import { TechniquesService } from "./techniques.service";

@Controller("techniques")
export class TechniquesController {
  constructor(private readonly techniquesService: TechniquesService) {}

  @ApiOperation(uploadFileApiOperationOptions)
  @ApiConsumes("multipart/form-data")
  @ApiBody(uploadFileApiBodyOptions)
  @Put("file-upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<any> {
    return this.techniquesService.uploadFile(file);
  }

  @ApiOperation(uploadFilesApiOperationOptions)
  @ApiConsumes("multipart/form-data")
  // @ApiBody(uploadFilesApiBodyOptions)
  @Put("files-upload-array")
  @UseInterceptors(FilesInterceptor("files"))
  async uploadFilesArrary(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.techniquesService.uploadFilesArrary(files);
  }

  @ApiOperation(uploadFilesApiOperationOptions)
  @ApiConsumes("multipart/form-data")
  // @ApiBody(uploadFilesApiBodyOptions)
  @Put("files-upload-any")
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFilesAny(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.techniquesService.uploadFilesAny(files);
  }

  @ApiOperation({
    summary: "Download a file",
    description: `# Download a file from the server
File downloaded from ./file-downloads/`,
  })
  @Get("file-download")
  async download(@Res() res: Response): Promise<void> {
    return this.techniquesService.download(res);
  }

  @Get("conditionally-download-json-or-buffer")
  async conditionallyDownloadJsonOrBuffer(@Res() response: Response) {
    const res =
      await this.techniquesService.conditionallyDownloadJsonOrBuffer(response);
    /**
     * when using `@Res() response: Response`,
     * you must manually send the response using response methods like response.json(), response.send(), etc.
     * NestJS will NOT automatically handle the response for you.
     * `return res;` // ❌ This return value is IGNORED by NestJS!
     */
    response.json(res);
  }

  @Get("preview-filelist")
  async previewFileList(): Promise<any> {
    return await this.techniquesService.previewFileList();
  }

  @Get("preview-image/:filename")
  async previewImage(
    @Param("filename") filename: string,
    @Res() res: any,
  ): Promise<any> {
    return await this.techniquesService.previewImage(filename, res);
  }

  @Delete("delete-file/:filename")
  async deleteFile(@Param("filename") filename: string) {
    return await this.techniquesService.deleteFile(filename);
  }

  @Post("upload-compressed-single-blob")
  @UseInterceptors(FileInterceptor("compressed_archive"))
  async uploadCompressedFiles(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    if (file.mimetype !== "application/gzip") {
      throw new BadRequestException("File must be gzipped");
    }
    try {
      const result = await this.techniquesService.uploadCompressedFiles(file);
      return {
        success: true,
        message: "Files processed successfully",
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process archive: ${(error as Error).message}`,
      );
    }
  }

  @Post("upload-compressed-single-blob-single-input")
  @UseInterceptors(FileInterceptor("compressed_archive"))
  async uploadCompressedFilesInASingleInput(
    @UploadedFile() file: Express.Multer.File,
    @Body("description") description: string,
  ) {
    console.log("description:", description);
    /* do validation manually in controller */
    const descriptionSchema =
      z.string(); /* schema should be defined in dto in real application */
    const validated = new ZodValidationPipe(descriptionSchema);
    console.log("validated:", validated);

    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    if (file.mimetype !== "application/gzip") {
      throw new BadRequestException("File must be gzipped");
    }
    try {
      const result = await this.techniquesService.uploadCompressedFiles(file);
      return {
        success: true,
        message: "Files processed successfully",
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process archive: ${(error as Error).message}`,
      );
    }
  }

  @Post("upload-modified-excel")
  @UseInterceptors(FileInterceptor("file"))
  async uploadModifiedExcel(@UploadedFile() file: Express.Multer.File) {
    return await this.techniquesService.uploadModifiedExcel(file);
  }

  @Post()
  create(@Body() createTechniqueDto: CreateTechniqueDto) {
    return this.techniquesService.create(createTechniqueDto);
  }

  @Get()
  findAll() {
    return this.techniquesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.techniquesService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateTechniqueDto: UpdateTechniqueDto,
  ) {
    return this.techniquesService.update(+id, updateTechniqueDto);
  }
}
