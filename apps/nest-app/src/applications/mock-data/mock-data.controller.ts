import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { MockDataService } from "./mock-data.service";

@ApiTags("Mock Data")
@Controller("mock-data")
export class MockDataController {
	constructor(private readonly mockDataService: MockDataService) {}

	@Get("online-dropdown/:term")
	async search(@Param("term") term: string) {
		return await this.mockDataService.search(term);
	}
}
