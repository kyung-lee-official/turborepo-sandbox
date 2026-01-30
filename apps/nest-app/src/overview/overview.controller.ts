import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
	UseInterceptors,
	UsePipes,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { type TestPipeDto, testPipeSchema } from "./dto/test-pipe.dto";
import { TestGuard } from "./guards/test.guard";
import { TestInterceptor } from "./interceptors/test.interceptor";
import type { OverviewService } from "./overview.service";
import { MethodPipe } from "./pipes/method.pipe";
import { ParamPipe } from "./pipes/param.pipe";
import { QueryPipe } from "./pipes/query.pipe";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe";

@Controller("overview")
export class OverviewController {
	constructor(private readonly overviewService: OverviewService) {}

	@ApiOperation({
		summary: "test middleware",
		description: "# Test Middleware.",
	})
	@Get("middleware")
	testMiddleware(@Req() req: Request) {
		return this.overviewService.testMiddleware(req);
	}

	@Get("exception-filters")
	async testExceptionFilters() {
		return await this.overviewService.testExceptionFilters();
	}

	@Get("return-void")
	async testReturnVoid() {
		return await this.overviewService.testReturnVoid();
	}

	@ApiOperation({
		summary: "test pipe",
		description: `# Test Pipe
Check the console log and the returned data.

## Order

The @UsePipes() decorator applies a controller-scoped/method-scoped pipe to the controller/method.

This case is a method-scoped pipe. A method-scoped pipe executes for body, query, and param in order.

**MethodPipe** (Body -> Query -> Param) -> **QueryPipe** -> **ParamPipe**

Note that previous pipes must return a value so the subsquent pipes can receive it.`,
	})
	@ApiParam({
		name: "id",
	})
	@ApiQuery({
		name: "page",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					example: "John",
				},
				age: {
					type: "number",
					example: 20,
				},
				email: {
					type: "string",
					example: "abc@example.com",
				},
			},
		},
	})
	@Post("pipes/:id")
	@UsePipes(new MethodPipe())
	testPipe(
		@Param("id", ParamPipe) param: any,
		@Query("page", QueryPipe) query: any,
		@Body() body: TestPipeDto
	) {
		return this.overviewService.testPipe(param, query, body);
	}

	@ApiOperation({
		summary: "test validation pipe",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					example: "John",
				},
				age: {
					type: "number",
					example: 20,
				},
				email: {
					type: "string",
					example: "abc@example.com",
				},
			},
		},
	})
	@Post("validation-pipe")
	@UsePipes(new ZodValidationPipe(testPipeSchema))
	testValidationPipe(@Body() body: TestPipeDto) {
		return this.overviewService.testValidationPipe(body);
	}

	@ApiOperation({
		summary: "test guard",
		description: `# Test Guard
Note that we can modify the request object in the guard.`,
	})
	@UseGuards(TestGuard)
	@Get("guard")
	testGuard(@Req() req: Request) {
		return this.overviewService.testGuard(req);
	}

	@ApiOperation({
		summary: "test interceptor",
		description: `# Test Interceptor
Check the console log and the returned data.`,
	})
	@UseInterceptors(TestInterceptor)
	@Post("interceptors")
	testInterceptor(@Req() req: Request) {
		return this.overviewService.testInterceptor(req);
	}

	@Patch(":id")
	update(
		@Param("id") id: string,
		/* if you want to validate the body of a PATCH request, this is where you would do it */
		@Body(new ZodValidationPipe(testPipeSchema))
		updateOverviewDto: TestPipeDto
	) {
		return this.overviewService.update(+id, updateOverviewDto);
	}

	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.overviewService.remove(+id);
	}
}
