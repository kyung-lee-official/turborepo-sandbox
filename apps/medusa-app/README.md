# HTTPS for Medusa Development

Modern browsers enforce stricter cookie policies for cross-site requests, even subdomains are considered cross-site (for example, `app.sandbox.localhost` and `api.sandbox.localhost` are different sites).

The auth JWT was stored in cookies with `SameSite` flag set to `None` (requires the `Secure` flag enabled), which allows the frontend and backend to be on different subdomains.

- Apply a certificate for HTTPS in development:
  1. Install [scoop](https://scoop.sh/) (Windows only)

  1. Install [mkcert](https://github.com/FiloSottile/mkcert)

     ```bash
     scoop bucket add extras
     scoop install mkcert
     ```

  1. Generate a wildcard certificate for `*.sandbox.localhost`:

     ```bash
     mkcert -install # install the local root CA
     mkcert "*.sandbox.localhost" # generate a wildcard certificate for sandbox.localhost, reminder: X.509 wildcards only go one level deep, so this won't match a.b.sandbox.localhost ℹ️
     ```

- Download [Caddy](https://github.com/caddyserver/caddy)

  Caddyfile:

  ```bash
  next.sandbox.localhost {
  	tls "path/to/certificates/_wildcard.sandbox.localhost.pem" "path/to/certificates/_wildcard.sandbox.localhost-key.pem"

  	reverse_proxy localhost:4000

  	log {
  		output file ./caddy.log
  	}
  }

  medusa.sandbox.localhost {
  	tls "path/to/certificates/_wildcard.sandbox.localhost.pem" "path/to/certificates/_wildcard.sandbox.localhost-key.pem"

  	reverse_proxy localhost:9000

  	log {
  		output file ./caddy.log
  	}
  }
  # HMR
  medusa.sandbox.localhost:5174 {
  	tls "path/to/certificates/_wildcard.sandbox.localhost.pem" "path/to/certificates/_wildcard.sandbox.localhost-key.pem"

  	reverse_proxy localhost:5173

  	log {
  		output file ./caddy.log
  	}
  }
  ```

* Configure Medusa backend to use HTTPS and the correct domain:

  In `medusa-config.ts`:

  ```ts
  module.exports = defineConfig({
    projectConfig: {
      // other configs...
      admin: {
        backendUrl: process.env.MEDUSA_BACKEND_URL,
        path: "/app",
        vite: (viteConfig) => {
          return {
            ...viteConfig,
            server: {
              ...viteConfig.server,
              allowedHosts: [".sandbox.localhost", "localhost"],
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
    },
  });
  ```

# Authentication

Authentication is handled using a single JWT. The JWT is issued by Medusa and stored via HttpOnly Cookie (cookie key `medusa_token`), with SameSite set to `None` to allow cross-site requests between subdomains (this requires implementing origin whitelist code in the backend).

A custom backend middleware validates the JWT before requests reach the Store API/Admin API, extracting the token from cookies and copying it to the `headers.authorization` field for downstream processing.

Frontend implementation:

- Since Medusa's built-in authentication endpoint

  ~~`POST /auth/{actor_type}/{auth_provider}`~~

  returns the token in JSON format and does not set HttpOnly Cookies, this endpoint is deprecated.
  Instead, we use a custom API

  ```
  POST /auth/sign-in/{actor_type}/{auth_provider}
  ```

  for login. After successful login, the backend sets an HttpOnly Cookie to store the JWT

- ```
  GET /store/customers/me
  ```

  retrieves current logged-in user information, stored in zustand store (browser memory, non-persistent)

- Custom API
  ```
  DELETE /auth/sign-out
  ```
  clears cookies and zustand store to complete logout

JWT refresh is automatically handled by the backend middleware after decoding and checking remaining time, with no frontend involvement required
