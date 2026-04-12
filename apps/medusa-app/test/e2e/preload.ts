import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@medusajs/framework/utils";
import { MetadataStorage } from "@mikro-orm/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDUSA_APP_ROOT = path.resolve(__dirname, "..", "..");

process.env.NODE_ENV ??= "test";

loadEnv("test", MEDUSA_APP_ROOT);
MetadataStorage.clear();
