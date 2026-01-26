import {
  authenticate,
  type ConfigModule,
  defineMiddlewares,
  errorHandler,
  logger,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework";
import { MedusaError, parseCorsOrigins } from "@medusajs/framework/utils";
import {
  ERROR_CODES,
  type HttpError,
  type HttpErrorData,
  type MedusaErrorCodes,
  MedusaErrorTypes,
} from "@repo/types";
import cors from "cors";
import { authenticateJwt } from "@/utils/middleware/authenticate-jwt";
import { medusaAuthBlocker } from "@/utils/middleware/medusa-auth-blocker";

const originalErrorHandler = errorHandler();

export default defineMiddlewares({
  routes: [
    {
      /**
       * astrisk matcher to apply to all routes, including non-existent ones
       */
      matcher: "*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");
          /**
           * here you can use req.originalUrl to access the request URL, req.url or req.path won't work
           * for example, /store/customers/me
           */
          //   logger.info(`URL >>>>>>>>>>>>>>>>>>>>>>>>> ${req.originalUrl}`);

          /**
           * throwing HttpErrors from middleware will be handled by the errorHandler below
           * uncomment the following lines to test
           */
          //   throw new HttpError("AUTH.FORBIDDEN");

          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
            credentials: true,
          })(req, res, next);
        },
      ],
    },
    {
      /**
       * Don't use regex matcher here as medusa doesn't parse it correctly like `app.use` in ExpressJS.
       * Instead, check for the pattern inside the middleware
       */
      matcher: "/auth",
      middlewares: [medusaAuthBlocker],
    },
    {
      matcher: "/store/customers*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          // some custom logic, remember to call next() to proceed to the next middleware
          return next();
        },
        authenticateJwt("customer", ["bearer"]),
      ],
    },
    {
      matcher: "/store/gift-cards/{:idOrCode}/redeem",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    {
      matcher: "/store/orders*",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    {
      matcher: "/store-api/payment*",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    {
      matcher: "/store/payment-collections*",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    {
      matcher: "/store/payment-collections*",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    {
      matcher: "/store/store-credit-accounts*",
      middlewares: [authenticateJwt("customer", ["bearer"])],
    },
    /* custom routes middlewares */
    {
      method: ["POST"],
      matcher: "/commerce-modules/customer/create-customer",
      middlewares: [
        authenticate("customer", ["bearer"], {
          allowUnregistered: true,
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/commerce-modules/user/create-user",
      middlewares: [
        authenticate("user", ["bearer"], {
          allowUnregistered: true,
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/tester",
      middlewares: [
        authenticate("tester", ["bearer"], {
          allowUnregistered: true,
        }),
      ],
    },
  ],

  errorHandler: (
    error: HttpError | MedusaError,
    req: MedusaRequest,
    res: MedusaResponse<HttpErrorData>,
    next: MedusaNextFunction,
  ) => {
    if (MedusaError.isMedusaError(error)) {
      const medusaError = error as MedusaError;
      const map: Record<MedusaErrorCodes, number> =
        MedusaErrorTypes[medusaError.type];
      res.status(Object.values(map)[0]).json({
        code: Object.keys(map)[0] as keyof typeof ERROR_CODES,
        message: medusaError.message,
        details: {},
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(error.status || 500).json({
      code: error.code || ERROR_CODES["SYSTEM.UNKNOWN_ERROR"],
      message: error.message || "",
      details: error.details || {},
      timestamp: error.timestamp || new Date().toISOString(),
    });
    return;
  },
});
