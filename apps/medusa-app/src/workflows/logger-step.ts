import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

/**
 * To use this step in multiple places, unique names must be given to the step when used in a workflow.
 * For example:
 *  loggerStep({
 *    input: {
 *      message: "xxxx",
 *    },
 *  }).config({
 *    name: "xxxx-logger",
 *  });
 */
export const loggerStep = createStep(
  "logger-step",
  async ({ input }: { input: unknown }) => {
    console.log(input);
    return new StepResponse({});
  },
);
