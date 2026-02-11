import {
  Body,
  Controller,
  Example,
  Header,
  Hidden,
  OperationId,
  Patch,
  Path,
  Post,
  Query,
  Response,
  Route,
  Security,
  Tags,
} from "tsoa";
import type { ReturnType } from "./update-user/[userId]/route";

@Route("scalar")
@Tags("Scalar") // For grouping in docs
@Security("bearerAuth") // applies to all methods (can be overridden)
export class CustomController extends Controller {
  /**
   * @summary Fetches custom data
   */
  @Patch("scalar-test/update-user/{userId}")
  // @Example is used to show response examples
  @Example<ReturnType>(
    {
      status: "ok",
      body: { exampleKey: "exampleValue" },
      params: { userId: "123" },
      query: { page: "1", area: "CN" },
    },
    "response 1",
  )
  @Example<ReturnType>(
    {
      status: "ok",
      body: { exampleKey: "exampleValue" },
      params: { userId: "456" },
      query: { page: "1", area: "US" },
    },
    "response 2",
  )
  public async example(
    @Body()
    body: Record<string, any>,
    @Path() userId: string,
    @Query("page") page: string,
    @Query("area") area?: string,
  ): Promise<ReturnType> {
    // When tsoa is used for spec generation only,
    // no implementation needed — tsoa only cares about the return type
    // dummy return, to satisfy TS
    return [] as unknown as ReturnType;
  }
}
