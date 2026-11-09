# jumptrade (web)

The public version of jumptrade: the same app as the private Claude version, served as an installable web app on Cloudflare.

```
web/      the app (same front end as the Claude version) + shim.js, which sends its data requests to /api/tool
worker/   the data server: answers the app's requests from a price provider (Yahoo Finance for now) and caches them
wrangler.toml   one Cloudflare Worker serves both: /api/* -> worker, everything else -> web/
```

## Deploy (one time, about 5 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**.
2. Pick GitHub → **Jumptradeapp/jumptrade** → keep the defaults (it reads `wrangler.toml`) → **Deploy**.
3. You get a link like `https://jumptrade.<your-name>.workers.dev`. Every push to `main` redeploys automatically.
4. Check it: open `/api/health` on that link — it should say `"ok": true`.

On an iPhone: open the link in Safari → Share → **Add to Home Screen**.

## Data provider

`worker/index.js` maps each app request (`get_stock_snapshot`, `get_stock_bars`, `get_gainers_losers`, …) to the provider and returns it
in the app's format. To switch to Webull's OpenAPI later, only that file changes; keys go in Cloudflare as secrets, never in this repo.

## Roadmap

- [x] Stage 1 — app shell, data server, movers, stock pages, charts, news, analyst targets, ETF compare
- [ ] Stage 2 — sign-in (owner + friends), in-app watchlists/portfolios/journal saved per person
- [ ] Stage 3 — push alerts (setups triggering, dips, watchlist moves, earnings)
- [ ] Stage 4 — sectors, options/Congress/shorts feeds, Ask jumptrade
