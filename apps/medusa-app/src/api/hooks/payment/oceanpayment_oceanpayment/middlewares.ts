import type { MiddlewareRoute } from "@medusajs/framework/http";

/**
 * Raw XML body for OceanPayment `noticeUrl` — disable global JSON/urlencoded parsers
 * so the route handler can read the stream.
 */
export const oceanpaymentOceanpaymentHooksMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/hooks/payment/oceanpayment_oceanpayment",
    bodyParser: false,
  },
];
