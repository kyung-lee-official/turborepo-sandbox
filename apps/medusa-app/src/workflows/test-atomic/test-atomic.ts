import {
  createHook,
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { stepOneStep } from "./steps/step-one";
import { stepThreeStep } from "./steps/step-three";
import { type StepTwoWorkflowInput, stepTwoStep } from "./steps/step-two";

/**
 * Medusa v2 Workflows doesn't offer strict ACID transactions for workflows.
 * Steps provide compensating function for rollback, but they do not guarantee
 * that all steps will be rolled back successfully in case of failure.
 */
export const testAtomicWorkflow = createWorkflow(
  "test-atomic-workflow",
  (input: StepTwoWorkflowInput) => {
    const stepOneResult = stepOneStep();
    const stepTwoResult = stepTwoStep(input);
    // here we can test hook by the way
    const myHook = createHook("testHook", {
      passAnythingToHook: input,
    });
    const stepThreeResult = stepThreeStep();

    const result = transform(
      {
        stepOneResult,
        stepTwoResult,
        stepThreeResult,
      },
      (input) => {
        return {
          message: "Test Atomic Workflow Completed",
          data: {
            stepOne: input.stepOneResult,
            stepTwo: input.stepTwoResult,
            stepThree: input.stepThreeResult,
          },
        };
      },
    );

    return new WorkflowResponse(result, {
      hooks: [myHook],
    });
  },
);
