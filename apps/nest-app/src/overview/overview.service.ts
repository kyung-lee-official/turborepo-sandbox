import { BadRequestException, Injectable } from "@nestjs/common";
import type { UpdateOverviewDto } from "./dto/update-overview.dto";

@Injectable()
export class OverviewService {
  testMiddleware(req: Request) {
    return { testMiddleware: (req as any).testMiddleware };
  }

  testExceptionFilters() {
    throw new BadRequestException("test exception filters");
  }
  testReturnVoid() {
    return;
  }

  testPipe(param: any, query: any, body: any) {
    return {
      param,
      query,
      body,
    };
  }

  testValidationPipe(body: any) {
    return body;
  }

  testGuard(req: Request) {
    return {
      testGuard: `Guard Passed!`,
      addedByGuard: (req as any).addedByGuard,
    };
  }

  testInterceptor(req: Request) {
    console.log("OverviewService.testInterceptor ", req.headers);
    console.log(
      "OverviewService.testInterceptor ",
      (req as any).beforeHandlerData,
    );
    return { inHandlerData: "in handler data" };
  }

  update(id: number, updateOverviewDto: UpdateOverviewDto) {
    return `This action updates a #${id} overview`;
  }

  remove(id: number) {
    return `This action removes a #${id} overview`;
  }
}
