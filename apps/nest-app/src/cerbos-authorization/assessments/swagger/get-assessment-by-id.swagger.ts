import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { GetAssessmentByIdDto } from "../dto/get-assessment-by-id.dto";

export class GetAssessmentById {
  principalName: string;
  assessmentId: string;

  constructor(dto: GetAssessmentByIdDto) {
    this.principalName = dto.principalName;
    this.assessmentId = dto.assessmentId;
  }
}

export const getAssessmentByIdOperationOptions: ApiOperationOptions = {
  summary: "Get assessment by principal",
  description:
    "for testing conveniences, provides principal directly without token",
};

export const getAssessmentByIdOptions: ApiBodyOptions = {
  type: GetAssessmentById,
  examples: {
    "Admin get Bob's assessment": {
      value: {
        principalName: "Kyung",
        assessmentId: "assessment_03",
      },
    },
    "Alice get Bob's assessment": {
      value: {
        principalName: "Alice",
        assessmentId: "assessment_03",
      },
    },
  },
};
