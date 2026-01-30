import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import {
  deleteDataByTaskIdApiOperation,
  deleteDataByTaskIdApiParam,
  getTaskByIdApiOperation,
  getTaskByIdApiParam,
  getTasksApiOperation,
  getValidationErrorsByTaskIdApiOperation,
  getValidationErrorsByTaskIdApiParam,
  uploadXlsxApiBody,
  uploadXlsxApiOperation,
} from "./swagger/upload-large-xlsx.swagger";
import { UploadLargeXlsxService } from "./upload-large-xlsx.service";

@ApiTags("Upload Large Xlsx")
@Controller("applications/upload-large-xlsx")
export class UploadLargeXlsxController {
  constructor(
    private readonly uploadLargeXlsxService: UploadLargeXlsxService,
  ) {}

  @ApiOperation(uploadXlsxApiOperation)
  @ApiConsumes("multipart/form-data")
  @ApiBody(uploadXlsxApiBody)
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadXlsx(
    @UploadedFile() file: Express.Multer.File,
    @Res() response: Response,
  ) {
    await this.uploadLargeXlsxService.uploadXlsx(file, response);
  }

  @ApiOperation(getTasksApiOperation)
  @Get("tasks")
  async getTasks(@Query("page", ParseIntPipe) page: number = 1) {
    return this.uploadLargeXlsxService.getTasks(page);
  }

  @ApiOperation(getTaskByIdApiOperation)
  @ApiParam(getTaskByIdApiParam)
  @Get("tasks/:taskId")
  async getTaskById(@Param("taskId", ParseIntPipe) taskId: number) {
    const task = await this.uploadLargeXlsxService.getTaskById(taskId);
    if (!task) {
      throw new BadRequestException(`Task with ID ${taskId} not found`);
    }
    return task;
  }

  @ApiOperation(deleteDataByTaskIdApiOperation)
  @ApiParam(deleteDataByTaskIdApiParam)
  @Delete("delete-task-by-id/:taskId")
  async deleteDataByTaskId(@Param("taskId", ParseIntPipe) taskId: number) {
    try {
      return await this.uploadLargeXlsxService.deleteDataByTaskId(taskId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete task: ${(error as Error).message}`,
      );
    }
  }

  @ApiOperation(getValidationErrorsByTaskIdApiOperation)
  @ApiParam(getValidationErrorsByTaskIdApiParam)
  @Get("get-validation-errors-by-task-id/:taskId")
  async getValidationErrorsByTaskId(
    @Param("taskId", ParseIntPipe) taskId: number,
    @Res() response: Response,
  ) {
    await this.uploadLargeXlsxService.getValidationErrorsByTaskId(
      taskId,
      response,
    );
  }
}
