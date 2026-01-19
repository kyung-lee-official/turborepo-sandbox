# localtunnel

Any request sent to `https://<SUBDOMAIN>.loca.lt` will be forwarded to your local development server.

For example, `GET https://<SUBDOMAIN>.loca.lt/anything` will be forwarded to `GET http://localhost:PORT/anything`.

If you quit this process and restart it immediately, you will likely get a random subdomain. To get the desired subdomain in the .env file, wait a few seconds before restarting.
