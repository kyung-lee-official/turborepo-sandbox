import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiStartProcessingAdapter } from "./api-start-processing.adapter";

@Controller("applications/async-processing")
export class StartProcessingController {
  constructor(
    private readonly apiStartProcessingAdapter: ApiStartProcessingAdapter,
  ) {}

  @Post("start")
  @HttpCode(202)
  async start(@Body() body: unknown) {
    return this.apiStartProcessingAdapter.handle(body);
  }
}
