# Password Manager Plus

Vue + Cloudflare Pages Functions password vault. The server can decrypt vaults;
this is **not** an end-to-end encrypted or zero-knowledge password manager.

## Development and checks

```sh
npm ci
npm test
npm run build
npx wrangler pages dev dist --kv PASSWORD_KV
```

Use the Wrangler origin for both frontend and API. Configure a real PASSWORD_KV
binding for deployment; the ID in wrangler.toml is a placeholder. Production
must use HTTPS. HTTP is supported for local development only.

## Authentication

- POST /api/auth with type register or login, username and password.
- New passwords require 12–100 characters. Existing 6-character passwords can
  still log in. Login hashes use PBKDF2-SHA256 with 100,000 iterations (versioned
  in each record). This improves on single SHA256 but is not a claim of meeting
  every current password-storage guideline; benchmark stronger KDFs before
  using the application for high-value secrets.
- Old SHA256 hashes upgrade after a successful login. The original salt and
  vault encryption derivation are preserved so existing ciphertext remains readable.
- Login sets pm_session, HttpOnly, SameSite=Strict, Path=/api, Secure on HTTPS.
  No token is returned in JSON or stored in localStorage.
- GET /api/auth checks the session and returns the username. Sessions expire
  after 24 hours; readSession also checks expiresAt explicitly.
- POST /api/auth with type logout deletes the server session and clears the cookie.
- All mutations require exact same Origin, application/json, and X-PM-Request: 1.
- GET/POST/PUT/DELETE /api/passwords require a valid v2 cookie session.
- Responses containing auth/vault data use Cache-Control: no-store.

## Upgrade and deployment cautions

1. Back up PASSWORD_KV before deploying. Test in a separate preview KV namespace;
   never bind preview deployments to your production secrets.
2. Deploy frontend and functions together. Old Bearer tokens are intentionally
   rejected. Users must log in again; old session records expire naturally.
3. Login upgrades are one-way for old application versions: rolling back to the
   original code will not recognize PBKDF2 hashes. Preserve a backup and plan
   any rollback; do not blindly overwrite live KV data.
4. The committed .dev.vars credential is removed from the new tree, not Git
   history. Rotate it anywhere it was reused. No Git history is rewritten.
5. KV throttles are best-effort (30 attempts/IP and 10/username per 15-minute
   bucket). KV read-modify-write is NOT atomic; eventual consistency and write
   limits mean it cannot guarantee protection under parallel/distributed load.
   Configure Cloudflare edge rate limits/WAF before exposing registration/login.
6. KV session deletion is also eventually consistent: logout clears the local
   cookie immediately after a successful delete, but a copied cookie may remain
   usable at another location during propagation. For immediate global
   revocation, atomic registration uniqueness and robust limits, move these
   operations to a strongly consistent service such as Durable Objects.
7. Vault data and per-session encryption material remain server-side in KV.
   Client-side encryption is a separate migration, not included here. Existing
   legacy plaintext records are still readable and encrypted on subsequent writes.
8. This patch does not add password reset/change, MFA or atomic concurrent vault
   updates. Always back up before destructive/import operations.

The node tests use an in-memory KV double; they validate application behavior,
not Cloudflare propagation, CPU quotas or browser cookie enforcement. Also test
registration, login, refresh, logout and old-vault migration in a preview deployment.
