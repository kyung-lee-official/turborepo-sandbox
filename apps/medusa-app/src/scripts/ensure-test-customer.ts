import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Idempotent: if a customer with CUSTOMER_ACCOUNT email exists, no-op.
 * Otherwise registers emailpass auth and creates the customer (seed uses Europe region).
 */
export default async function ensureTestCustomer({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const email = process.env.CUSTOMER_ACCOUNT?.trim();
  const password = process.env.PASSWORD;

  if (!email || !password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "CUSTOMER_ACCOUNT and PASSWORD must be set for ensure-test-customer",
    );
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: existingCustomers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { email },
  });

  if (existingCustomers.length > 0) {
    logger.info(`[ensure-test-customer] Customer already exists: ${email}`);
    return;
  }

  const authModule = container.resolve(Modules.AUTH);
  const registerResult = await authModule.register("emailpass", {
    body: { email, password },
  });

  const authIdentity = registerResult.authIdentity;
  const regError = registerResult.error;

  if (regError || !authIdentity) {
    const msg =
      typeof regError === "string"
        ? regError
        : ((regError as unknown as { message?: string })?.message ??
          "Auth registration failed");
    logger.warn(
      `[ensure-test-customer] ${msg} (email may already be registered)`,
    );
    const { data: afterRetry } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { email },
    });
    if (afterRetry.length > 0) {
      logger.info(
        `[ensure-test-customer] Customer present after failed register: ${email}`,
      );
      return;
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, msg);
  }

  const { result: customer } = await createCustomerAccountWorkflow(
    container,
  ).run({
    input: {
      authIdentityId: authIdentity.id,
      customerData: {
        email,
        first_name: "Test",
        last_name: "Customer",
      },
    },
  });

  logger.info(
    `[ensure-test-customer] Created customer ${customer.id} for ${email}`,
  );
}
