import { createWorkflow } from "@medusajs/framework/workflows-sdk";
import { testNotificationStep } from "./steps/test-notification";

type TestNotificationWorkflowInput = {
  foo: unknown;
};

export const testNotificationWorkflow = createWorkflow(
  "test-notification-workflow",
  (input: TestNotificationWorkflowInput) => {
    testNotificationStep(input);
  },
);
