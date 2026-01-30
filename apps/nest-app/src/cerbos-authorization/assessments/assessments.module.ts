import { Module } from "@nestjs/common";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";
import { GetAssessmentByIdGuard } from "./guard/get-assessment-by-id.guard";

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, GetAssessmentByIdGuard],
})
export class AssessmentsModule {}
