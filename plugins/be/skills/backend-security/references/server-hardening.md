# Server hardening — snippets

Copy-adaptable server-side snippets behind `SKILL.md`. The guards and response builders they plug into are `api-architecture`'s and `access-control`'s; budgets and tiers are `rate-limiting`'s.

## Contents

- [Object-level authorisation](#object-level-authorisation)
- [Fields: allowlist writes, project reads](#fields-allowlist-writes-project-reads)
- [Token verification](#token-verification)
- [SSRF-safe outbound fetch](#ssrf-safe-outbound-fetch)
- [CSRF in the proxy](#csrf-in-the-proxy)
- [Sanitising stored rich HTML](#sanitising-stored-rich-html)
- [Parameterised queries](#parameterised-queries)
- [Failing closed](#failing-closed)

## Object-level authorisation

```ts
// Verify the token once, load the specific object, resolve the actor's role on it, then check.
export async function loadProjectWithPermission(request: Request, projectId: string, permission: Permission) {
  const actor = await requireSession(request); // identity from the verified token
  const project = await getProject(projectId);
  if (!project || project.tenantId !== actor.tenantId) throw new NotFoundError(); // 404, never 403
  const resourceRole = resolveProjectRole(actor, project);
  if (!can({ ...actor, resourceRole }, permission)) throw new ForbiddenError();
  return { actor, project };
}
```

A second id in the body — a target project, a parent — goes through its own load-and-check.

## Fields: allowlist writes, project reads

```ts
// WRITE: pick exactly what the caller may set; .omit() lets every new server field through.
const UpdateProfileSchema = ProfileSchema.pick({ displayName: true, bio: true });

// READ: a projection for a less-privileged caller — never the document whole.
const PublicProfileSchema = ProfileSchema.pick({ id: true, displayName: true, bio: true });
export const toPublicProfile = (profile: Profile) => PublicProfileSchema.parse(profile);
```

## Token verification

For tokens the platform's SDK doesn't verify for you:

```ts
const { payload } = await jwtVerify(token, keySet, {
  algorithms: ["RS256"], // pinned — never "none" or the token's own choice
  issuer: EXPECTED_ISSUER,
  audience: EXPECTED_AUDIENCE,
}); // rejects a bad signature, issuer, audience or expiry
if (await isRevoked(payload.jti)) throw new UnauthorisedError();
```

A JWT is signed, not encrypted: no secrets or personal data in its payload.

## SSRF-safe outbound fetch

```ts
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export async function fetchUserUrl(rawUrl: string): Promise<Response> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new BadRequestError("Only https URLs are allowed");
  const records = await lookup(url.hostname, { all: true }); // every A and AAAA record
  for (const { address } of records) {
    if (ipaddr.process(address).range() !== "unicast") throw new BadRequestError("That address isn't allowed");
  } // refuses 169.254.169.254, 10/8, 127/8, ::1, fc00::/7 and IPv4-mapped forms of them
  return fetch(url, { redirect: "error", signal: AbortSignal.timeout(5_000) });
}
```

Still open in this sketch: the resolver can answer differently when the real connection is made (DNS rebinding) — pin the checked address for the socket where the HTTP client allows it — and the body size needs a cap while reading. The same guard covers every URL an AI tool can make the server fetch.

## CSRF in the proxy

```ts
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isCrossSiteMutation(request: Request): boolean {
  if (!MUTATING.has(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true; // Fetch Metadata first
  const origin = request.headers.get("origin") ?? originOf(request.headers.get("referer"));
  return !origin || !ALLOWED_ORIGINS.includes(origin); // exact match, never a suffix check
}
// In the proxy: if (hasSessionCookie(request) && isCrossSiteMutation(request)) → 403.
```

## Sanitising stored rich HTML

```ts
import sanitizeHtml from "sanitize-html";

import { RICH_TEXT_POLICY } from "@org/contracts"; // tags, attributes per tag (a: href, title, rel) and schemes (http, https); the browser's sanitiser reads the same

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_POLICY.allowedTags],
  allowedAttributes: RICH_TEXT_POLICY.allowedAttributes, // rel listed, or the transform's rel is stripped
  allowedSchemes: [...RICH_TEXT_POLICY.allowedSchemes],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }) },
};

export const sanitiseRichText = (html: string) => sanitizeHtml(html, SANITIZE_OPTIONS); // at write time
```

## Parameterised queries

```ts
// SQL: placeholders; the driver escapes the values.
await db.query("SELECT id, name FROM users WHERE tenant_id = $1 AND id = $2", [tenantId, userId]);
// NoSQL: build the filter from scalar fields — never pass a request object as the filter.
```

## Failing closed

```ts
try {
  await runPrivilegedAction(actor);
} catch (error) {
  logger.error({ error, correlationId, actorId: actor.uid }); // the detail stays on the server
  return errorResponse(error); // a typed status and a generic message; never a stack trace
}
// A catch around a check denies. Never `catch { return allow() }`.
```
