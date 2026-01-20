import { Modules } from "@medusajs/framework/utils";
import { createStep } from "@medusajs/framework/workflows-sdk";
import type { INotificationModuleService } from "@medusajs/types/dist/notification/service";

type TestNotificationStepInput = {
  foo: unknown;
};

export const testNotificationStep = createStep(
  "test-notification-step",
  async (input: TestNotificationStepInput, { container }) => {
    const notificationModuleService = container.resolve(
      Modules.NOTIFICATION,
    ) as INotificationModuleService;

    await notificationModuleService.createNotifications({
      to: "customer@gmail.com",
      channel: "email",
      template: "product-created",
      data: {
        product_title: "Test Product",
        foo: input.foo,
      },
    });
  },
);
