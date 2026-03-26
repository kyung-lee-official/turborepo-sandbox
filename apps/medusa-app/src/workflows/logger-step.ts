import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export const loggerStep = createStep(
  "logger-step",
  async ({ input }: { input: unknown }) => {
    console.log(input);
    return new StepResponse({});
  },
);
