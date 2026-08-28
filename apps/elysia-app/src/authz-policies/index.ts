import type { ResourcePolicyDefinition } from "@kyung.lee/authz";
import { authenticationPolicy } from "./authentication.js";
import { financePaypalInvoicePolicy } from "./finance-paypal-invoice.js";
import { membersPolicy } from "./members.js";
import {
  performanceEventApprovalPolicy,
  performanceEventPolicy,
  performanceSectionPolicy,
  performanceStatPolicy,
  performanceTemplatePolicy,
} from "./performances.js";
import { rolesPolicy } from "./roles.js";
import { salesDataPolicy } from "./sales-data.js";
import { serverSettingsPolicy } from "./server-settings.js";
import { snsCrawlerPolicy } from "./sns-crawler.js";
import { softwareFeedbackPolicy } from "./software-feedback.js";

export const POLICY_REGISTRY: Readonly<
  Record<string, ResourcePolicyDefinition>
> = {
  [membersPolicy.resource]: membersPolicy,
  [authenticationPolicy.resource]: authenticationPolicy,
  [rolesPolicy.resource]: rolesPolicy,
  [serverSettingsPolicy.resource]: serverSettingsPolicy,
  [salesDataPolicy.resource]: salesDataPolicy,
  [financePaypalInvoicePolicy.resource]: financePaypalInvoicePolicy,
  [snsCrawlerPolicy.resource]: snsCrawlerPolicy,
  [softwareFeedbackPolicy.resource]: softwareFeedbackPolicy,
  [performanceEventPolicy.resource]: performanceEventPolicy,
  [performanceEventApprovalPolicy.resource]: performanceEventApprovalPolicy,
  [performanceSectionPolicy.resource]: performanceSectionPolicy,
  [performanceStatPolicy.resource]: performanceStatPolicy,
  [performanceTemplatePolicy.resource]: performanceTemplatePolicy,
};

export {
  authenticationPolicy,
  financePaypalInvoicePolicy,
  membersPolicy,
  performanceEventApprovalPolicy,
  performanceEventPolicy,
  performanceSectionPolicy,
  performanceStatPolicy,
  performanceTemplatePolicy,
  rolesPolicy,
  salesDataPolicy,
  serverSettingsPolicy,
  snsCrawlerPolicy,
  softwareFeedbackPolicy,
};
