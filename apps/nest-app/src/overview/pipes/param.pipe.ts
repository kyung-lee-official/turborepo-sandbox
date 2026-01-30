import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";

@Injectable()
export class ParamPipe
  implements
    PipeTransform<
      string | number,
      {
        value: number | string;
        type: "body" | "query" | "param" | "custom";
        data?: string;
      }
    >
{
  transform(value: string | number, metadata: ArgumentMetadata) {
    console.log("ParamPipe");
    switch (value) {
      case "1":
        value = 1;
        break;
      case "2":
        value = "二";
        break;
      case "3":
        value = "셋";
        break;
      case "4":
        value = "Four";
        break;
      default:
        value = 0;
        break;
    }
    return { value, type: metadata.type, data: metadata.data };
  }
}
