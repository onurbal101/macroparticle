# Release to the VPS

1. Run the checks in the project README and build `dist/` from the release commit.
2. Transfer `dist/` to `/home/deploy/services/apps/macroparticle/releases/<commit>/`. Keep `Caddyfile` and `compose.yaml` in the application directory.
3. From that directory, set `releases/current` to the new release using an atomic symlink replacement, then run `docker compose up -d`. Only the shared Caddy network can reach `macroparticle-web:8080`.
4. The shared Caddy configuration routes `macroparticle.onurbal.com` to `macroparticle-web:8080`. Keep Cloudflare DNS pointed at the VPS.
5. Check HTTPS, direct programme links, the service worker, offline reload, and the QR destinations in `public/print/manifest.json`.

When `ops/Caddyfile` changes, validate it in a separate container first. Keep a copy of the current configuration outside the public `releases/` tree. Copy the new file to the application directory and restart the `web` service after switching the release. If the checks fail, restore both the previous configuration and the previous release link, then restart `web`.

The configuration serves generated route files (`/programs/defrost-2.html`) at their clean URLs (`/programs/defrost-2`). Unknown routes return the generated 404 page with HTTP 404. Check route-specific HTML with WhatsApp and Telegram crawler user agents, preview image content types and dimensions, Markdown responses, redirects, and `noindex` on personal pages. The shared proxy configuration does not need to change for this release.

To roll back, point `releases/current` at the previous release. Keep the previous release directory until the new one passes the checks.
