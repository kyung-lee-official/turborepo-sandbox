import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

if (!process.env.MEDUSA_BACKEND_URL) {
  throw new Error("MEDUSA_BACKEND_URL is not defined in environment variables");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

if (!process.env.STORE_CORS) {
  throw new Error("STORE_CORS is not defined in environment variables");
}

if (!process.env.ADMIN_CORS) {
  throw new Error("ADMIN_CORS is not defined in environment variables");
}

if (!process.env.AUTH_CORS) {
  throw new Error("AUTH_CORS is not defined in environment variables");
}

if (!process.env.PORT) {
  throw new Error("PORT is not defined in environment variables");
}
if (Number.isNaN(parseInt(process.env.PORT, 10))) {
  throw new Error("PORT must be a valid number");
}

if (!process.env.PAYPAL_CLIENT_ID) {
  throw new Error("PAYPAL_CLIENT_ID is not defined in environment variables");
}
if (!process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error(
    "PAYPAL_CLIENT_SECRET is not defined in environment variables",
  );
}

if (!process.env.OCEANPAYMENT_ACCOUNT) {
  throw new Error(
    "OCEANPAYMENT_ACCOUNT is not defined in environment variables",
  );
}
if (!process.env.OCEANPAYMENT_TERMINAL) {
  throw new Error(
    "OCEANPAYMENT_TERMINAL is not defined in environment variables",
  );
}
if (!process.env.OCEANPAYMENT_SECURE_CODE) {
  throw new Error(
    "OCEANPAYMENT_SECURE_CODE is not defined in environment variables",
  );
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      /* set your desired duration here, e.g., "1h", "7d" */
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    path: "/app",
    vite: (viteConfig) => {
      return {
        ...viteConfig,
        server: {
          ...viteConfig.server,
          allowedHosts: [".sandbox.local", "local"],
          host: true,
          port: parseInt(process.env.PORT as string, 10) || 9000,
          strictPort: true,
          hmr: {
            protocol: "wss",
            port: 5173,
            clientPort: 5174,
          },
        },
      };
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          // {
          // 	resolve: "@medusajs/medusa/notification-local",
          // 	id: "local",
          // 	options: {
          // 		channels: ["email"],
          // 	},
          // },
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_SENDER_EMAIL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-local",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            // if module provider is in a plugin, use `plugin-name/providers/paypal-payment`
            resolve: "./src/modules/paypal-payment",
            id: "paypal",
            options: {
              // provider options...
              clientId: process.env.PAYPAL_CLIENT_ID,
              clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            },
          },
          {
            // Hosted Checkout only — https://dev.oceanpayment.com/en/docs/payment/introduction
            resolve: "./src/modules/ocean-payment",
            id: "oceanpayment",
            options: {
              account: process.env.OCEANPAYMENT_ACCOUNT,
              terminal: process.env.OCEANPAYMENT_TERMINAL,
              secureCode: process.env.OCEANPAYMENT_SECURE_CODE,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_API_KEY,
        productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME,
      },
    },
    {
      resolve: "./src/modules/tester",
    },
  ],
});
