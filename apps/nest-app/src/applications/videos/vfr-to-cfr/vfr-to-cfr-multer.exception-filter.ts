import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { MulterError } from "multer";
import { resolveVfrToCfrMaxUploadBytes } from "./vfr-to-cfr.constants";

@Catch(MulterError)
export class VfrToCfrMulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === "LIMIT_FILE_SIZE") {
      const maxUploadBytes = resolveVfrToCfrMaxUploadBytes();
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `Video exceeds the upload limit (${formatGiB(maxUploadBytes)} GiB max).`,
        maxUploadBytes,
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
    });
  }
}

function formatGiB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}
