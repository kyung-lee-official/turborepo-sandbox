// scripts/start-tunnel.js
require("dotenv").config(); // loads your .env file

const localtunnel = require("localtunnel");

if (!process.env.PORT) {
  throw new Error("Please set the PORT environment variable in .env");
}
const port = parseInt(process.env.PORT, 10);

if (!process.env.SUBDOMAIN) {
  console.warn("No SUBDOMAIN set in .env — will get a random one");
}
const subdomain = process.env.SUBDOMAIN;

try {
  const tunnel = await localtunnel({
    port,
    subdomain, // only used if available
  });

  console.log("Tunnel is live! 🌐");
  console.log("Public URL →", tunnel.url);
  console.log(
    `Anything sent to ${tunnel.url} will be forwarded to http://localhost:` +
      port,
  );
  console.log(
    `For example, GET ${tunnel.url}/anything will be forwarded to GET http://localhost:${port}/anything`,
  );

  tunnel.on("close", () => {
    console.log("Tunnel closed 😢");
  });

  tunnel.on("error", (err: Error) => {
    console.error("Tunnel error:", err);
  });

  // Optional: Keep the process alive (useful if running standalone)
  process.on("SIGINT", () => {
    tunnel.close();
    process.exit(0);
  });
} catch (err) {
  console.error("Failed to create tunnel:", err);
  process.exit(1);
}
