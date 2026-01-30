import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";

export class MethodPipe implements PipeTransform<any, any> {
  transform(value: unknown, metadata: ArgumentMetadata) {
    console.log(`MethodPipe, ${metadata.type}, ${metadata.data},`, value);
    return value;
  }
}
