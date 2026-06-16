/// <reference types="bun" />

export {};

const enabled = process.env.ENABLE_BORE;

if (enabled !== "1" && enabled !== "true") {
  console.log("[bore] skipped — set ENABLE_BORE=1 in .env.base to enable");
  process.exit(0);
}

const proc = Bun.spawn({
  cmd: [
    "bore",
    "local",
    "9000",
    "--to",
    "payment-webhook-dev.mathub.xyz",
    "--secret",
    "supersecret",
    "--port",
    "4000",
  ],
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

process.exit(await proc.exited);
