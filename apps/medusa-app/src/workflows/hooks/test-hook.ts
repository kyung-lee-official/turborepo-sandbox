import { testAtomicWorkflow } from "../test-atomic/test-atomic";

testAtomicWorkflow.hooks.testHook(
  async ({ passAnythingToHook }, { container }) => {
    console.log("passAnythingToHook >>> ", passAnythingToHook);
  },
);
