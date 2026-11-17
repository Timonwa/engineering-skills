# Webhooks

A webhook is a provider calling your API — a payment processor, an email service, a version-control host. It has no user, so the provider's signature is the only gate, and the provider retries until it gets a 2xx. Sending webhooks to customers is `webhook-delivery`'s.

## The route

```ts
export async function POST(request: Request) {
  try {
    await handleProviderWebhook(await request.text(), request.headers.get("x-provider-signature"));
    return ok(null, "Event received");
  } catch (error) {
    return errorResponse(error);
  }
}

// Opened in a browser to see the endpoint is live on this tier; reads nothing.
export async function GET(request: Request) {
  try {
    await applyRateLimit(request, "PUBLIC", "webhooks:provider:ping");
    return ok({ status: "ok", tier: env.APP_ENV }, "Webhook is live");
  } catch (error) {
    return errorResponse(error);
  }
}
```

- **One folder per provider** under `webhooks/<provider>/`.
- **No user rate limit on the `POST`** — the signature is the gate. The `GET` ping is public and takes one.

## The service

1. **Verify the signature over the raw body**, before parsing anything, with a constant-time comparison (`backend-security`). Read the body as text; a parsed and re-serialised body no longer matches what was signed. A bad or missing signature is a 401.
   - **Refuse a replay:** when the provider signs a timestamp with the body, refuse one outside a short tolerance (five minutes is common). The event-id record catches a repeat inside it.
   - **During a secret rotation**, accept a signature from either the old or the new secret until the provider has switched; then remove the old one.
2. **Record the event once**, keyed by the provider's event id (or a hash of the body when it has none), in a transaction that refuses a duplicate. A repeat delivery returns 200 and does nothing.
3. **Handle it.** State changes are guarded so the same event can't move a record twice.
4. **On failure, forget the event and fail the request**, so the provider's retry is handled rather than skipped as a duplicate.

## Answering in time

Providers wait only seconds for an answer before counting a delivery as failed and retrying it. Handle inline only work that is quick and touches nothing slow. Otherwise, verify, record the event, answer 2xx, and process it from a queue — the queue's retries then replace the provider's, so a failure marks the record for retry instead of forgetting it.

Keep the full provider payload in the record — it's the evidence when a dispute or reconciliation needs what the provider actually sent.

## Order of events

Providers don't promise order. Handle each event from the state it carries, not from the event that "should" have come before it; when the record is ahead of the event, ignore the older one.

## Testing

A route test signs a sample body with a test secret, posts it to the exported handler, and asserts the record and the state change; a second post asserts nothing happens twice; a bad signature asserts a 401 (`testing`).
