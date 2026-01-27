# Caddyfile

> The bun server runs

```caddyfile
bun.localhost {
	tls "C:/Users/wulfr/.ssh/certificates/bun.localhost.pem" "C:/Users/wulfr/.ssh/certificates/bun.localhost-key.pem"

	reverse_proxy localhost:5000

	log {
		output file ./caddy.log
	}
}
```