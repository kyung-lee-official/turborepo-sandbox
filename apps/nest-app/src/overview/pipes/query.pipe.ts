import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";

@Injectable()
export class QueryPipe
  implements
    PipeTransform<
      string,
      {
        value: number;
        type: "body" | "query" | "param" | "custom";
        data?: string;
      }
    >
{
  transform(value: any, metadata: ArgumentMetadata) {
    console.log("QueryPipe");
    const parsed = parseInt(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException("Invalid page query");
    }
    return { value: parsed, type: metadata.type, data: metadata.data };
  }
}
