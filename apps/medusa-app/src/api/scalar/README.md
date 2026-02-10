# Scalar

This code snippet demonstrates how to integrate Scalar's API reference UI into your Medusa application. Put it inside a custom route handler where you want to serve the API documentation.

```ts
/**
 * Swagger
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const html = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>API Documentation</title>
	<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
	</head>
	<body>
	<div id="swagger-ui"></div>
	<script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
	<script>
		SwaggerUIBundle({
		url: null,
		spec: ${JSON.stringify(swaggerJson)},
		dom_id: '#swagger-ui',
		presets: [
			SwaggerUIBundle.presets.apis,
			SwaggerUIBundle.presets.standalone
		]
		});
	</script>
	</body>
	</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.send(html);
}
```

```ts
/**
 * Scalar UI
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { apiReference } = await import("@scalar/express-api-reference");
  // Scalar's middleware factory
  const scalarMiddleware = apiReference({
    // Option A: Reference by URL (recommended, allows caching)
    // url: "/admin/openapi", // Points to your raw spec route above
    // Option B: Embed spec directly (zero extra requests, good for small specs)
    content: embeddedSpec ? JSON.parse(embeddedSpec) : undefined,
    // Customize look & feel (optional but powerful)
    pageTitle: "Medusa Custom API Reference",
    darkMode: true, // or detect from user preference
    hideModels: false,
    defaultHttpClient: {
      targetKey: "shell",
      clientKey: "curl",
    },
    // customCss: `
    //   /* Optional: Tweak colors, fonts, etc. */
    //   .scalar-app { --scalar-color-1: #0f62fe; }
    // `,
    // Add AI chat if you want (Scalar Agent feature)
    // agent: true,
  });
  // Manually invoke the middleware (since no app.use)
  // Scalar's middleware returns an array or function – invoke it
  await new Promise<void>((resolve, reject) => {
    scalarMiddleware(req as any, res as any);
  });
}
```
