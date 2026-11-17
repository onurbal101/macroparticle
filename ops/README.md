# Release to the VPS

1. Run the checks in the project README and build `dist/` from the release commit.
2. Transfer `dist/` to `/home/deploy/services/apps/macroparticle/releases/<commit>/`. Keep `Caddyfile` and `compose.yaml` in the application directory.
3. From that directory, set `releases/current` to the new release using an atomic symlink replacement, then run `docker compose up -d`. Only the shared Caddy network can reach `macroparticle-web:8080`.
4. The shared Caddy configuration routes `macroparticle.onurbal.com` to `macroparticle-web:8080`. Keep Cloudflare DNS pointed at the VPS.
5. Check HTTPS, direct programme links, the service worker, offline reload, and the QR destinations in `public/print/manifest.json`.

To roll back, point `releases/current` at the previous release. Keep the previous release directory until the new one passes the checks.
