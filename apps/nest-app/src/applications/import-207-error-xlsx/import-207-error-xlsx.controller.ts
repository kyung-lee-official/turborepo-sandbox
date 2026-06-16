import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { XLSX_CONTENT_TYPE } from "../../utils/shared/xlsx";
import { Import207ErrorXlsxService } from "./import-207-error-xlsx.service";

@ApiTags("Import 207 Error XLSX")
@Controller("applications/import-207-error-xlsx")
export class Import207ErrorXlsxController {
  constructor(
    private readonly import207ErrorXlsxService: Import207ErrorXlsxService,
  ) {}

  @ApiOperation({
    summary: "Import people from XLSX with 207 error workbook partial success",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: ["file"],
    },
  })
  @Post("people")
  @UseInterceptors(FileInterceptor("file"))
  async importPeople(
    @UploadedFile() file: Express.Multer.File,
    @Res() response: Response,
  ) {
    await this.import207ErrorXlsxService.importPeople(file, response);
  }

  @Get("people")
  listImportedRows() {
    return this.import207ErrorXlsxService.listImportedRows();
  }

  @Get("sample")
  async downloadSample(@Res() response: Response) {
    const buffer = await this.import207ErrorXlsxService.buildSampleWorkbook();
    response.setHeader("Content-Type", XLSX_CONTENT_TYPE);
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="people-import-sample.xlsx"',
    );
    response.status(200).send(buffer);
  }
}
