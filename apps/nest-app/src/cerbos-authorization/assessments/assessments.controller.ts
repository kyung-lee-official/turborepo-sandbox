import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "@/overview/pipes/zod-validation.pipe";
import type { AssessmentsService } from "./assessments.service";
import {
  type GetAssessmentByIdDto,
  getAssessmentByIdSchema,
} from "./dto/get-assessment-by-id.dto";
import type { UpdateAssessmentByIdDto } from "./dto/update-assessment.dto";
import { GetAssessmentByIdGuard } from "./guard/get-assessment-by-id.guard";
import {
  getAssessmentByIdOperationOptions,
  getAssessmentByIdOptions,
} from "./swagger/get-assessment-by-id.swagger";

@ApiTags("Assessments")
@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @ApiOperation(getAssessmentByIdOperationOptions)
  @ApiBody(getAssessmentByIdOptions)
  @UseGuards(GetAssessmentByIdGuard)
  @Post()
  getAssessmentById(
    @Body(new ZodValidationPipe(getAssessmentByIdSchema))
    getAssessmentByIdDto: GetAssessmentByIdDto,
  ) {
    return this.assessmentsService.getAssessmentById(getAssessmentByIdDto);
  }

  @Patch(":id")
  updateAssessmentById(
    @Param("id") id: string,
    @Body() updateAssessmentDto: UpdateAssessmentByIdDto,
  ) {
    return this.assessmentsService.updateAssessmentById(
      +id,
      updateAssessmentDto,
    );
  }
}
