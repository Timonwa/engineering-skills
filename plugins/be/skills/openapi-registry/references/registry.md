# The registry — code

The shared helper every group module calls, a group's entries, the spec config, and the coverage test.

## Contents

- [The shared helper](#the-shared-helper)
- [A group module](#a-group-module)
- [The spec config](#the-spec-config)
- [The coverage test](#the-coverage-test)

## The shared helper

```ts
// docs/registry/register.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type { TagName } from "../tags";

export const registry = new OpenAPIRegistry();

const BEARER = registry.registerComponent("securitySchemes", "BearerAuth", { type: "http", scheme: "bearer" });
const SESSION = registry.registerComponent("securitySchemes", "SessionCookie", {
  type: "apiKey",
  in: "cookie",
  name: SESSION_COOKIE_NAME,
});

const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
  })
  .meta({ id: "ErrorResponse" });
const JSON_ERROR = { "application/json": { schema: ErrorResponseSchema } };

export interface RouteDefinition {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tag: TagName; // closed: a typo fails the type check
  operationId: string;
  summary: string;
  description?: string;
  auth?: boolean;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
  bodyContentType?: "application/json" | "multipart/form-data";
  response?: z.ZodType;
  paginated?: boolean;
  successStatus: 200 | 201 | 202 | 204;
  additionalErrors?: Record<number, string>;
  deprecated?: boolean;
}

export function registerRoute(definition: RouteDefinition): void {
  const { method, path, tag, auth = false, params, query, body, response, paginated = false } = definition;

  const success = z.object({
    success: z.literal(true),
    data: response ?? z.object({}),
    message: z.string().optional(),
    ...(paginated ? { metadata: PaginationMetadataSchema } : {}),
  });

  registry.registerPath({
    method,
    path,
    tags: [tag],
    operationId: definition.operationId,
    summary: definition.summary,
    description: definition.description,
    deprecated: definition.deprecated,
    security: auth ? [{ [BEARER.name]: [] }, { [SESSION.name]: [] }] : undefined,
    request: {
      params,
      query,
      body: body && { required: true, content: { [definition.bodyContentType ?? "application/json"]: { schema: body } } },
    },
    responses: {
      [definition.successStatus]:
        definition.successStatus === 204
          ? { description: "No content" }
          : { description: "Success", content: { "application/json": { schema: success } } },
      // The standard set, derived from the entry — never restated per route.
      ...((params || query || body) && { 400: { description: "Validation error", content: JSON_ERROR } }),
      ...(auth && {
        401: { description: "Not signed in", content: JSON_ERROR },
        403: { description: "Not permitted", content: JSON_ERROR },
      }),
      ...(params && { 404: { description: "Not found", content: JSON_ERROR } }),
      ...Object.fromEntries(
        Object.entries(definition.additionalErrors ?? {}).map(([status, text]) => [
          status,
          { description: text, content: JSON_ERROR },
        ]),
      ),
      429: { description: "Rate limit exceeded; see Retry-After", headers: RATE_LIMIT_HEADERS, content: JSON_ERROR },
      500: { description: "Internal error", content: JSON_ERROR },
    },
  });
}
```

## A group module

```ts
// docs/registry/projects.ts — imported for its side effects by docs/registry.ts
import { CreateItemSchema, ItemSchema, ItemListItemSchema, ProjectParamsSchema } from "@org/contracts";
import { registerRoute } from "./register";

registerRoute({
  method: "post",
  path: "/api/v1/projects/{projectId}/items",
  tag: "Projects",
  operationId: "createProjectItem",
  summary: "Create an item",
  auth: true,
  params: ProjectParamsSchema,
  body: CreateItemSchema, // the schema the handler validates with
  response: ItemSchema,
  successStatus: 201,
  additionalErrors: { 409: "An item with that name already exists." }, // plan limits are 403, derived from the guard
});

registerRoute({
  method: "get",
  path: "/api/v1/projects/{projectId}/items",
  tag: "Projects",
  operationId: "listProjectItems",
  summary: "List a project's items",
  auth: true,
  params: ProjectParamsSchema,
  query: CursorPageQuerySchema,
  response: ItemListItemSchema.array(),
  paginated: true,
  successStatus: 200,
});
```

```ts
// docs/registry.ts — the one file that knows every group
import "./registry/system";
import "./registry/public";
import "./registry/projects";
import "./registry/admin";

export { registry, registerRoute } from "./registry/register";
```

## The spec config

```ts
// docs/tags.ts — the closed list, in display order
export const TAGS = [
  { name: "System", description: "Liveness and the reference itself." },
  { name: "Projects", description: "A member's projects and their items, gated by the caller's role on the project." },
] as const;
export type TagName = (typeof TAGS)[number]["name"];
```

```ts
// docs/openapi.ts — built on first request, then cached for the process
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

let cachedDocument: ReturnType<OpenApiGeneratorV31["generateDocument"]> | null = null;

export function getOpenApiDocument() {
  cachedDocument ??= new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "Example API", version: "1.0.0", description: API_DESCRIPTION },
    servers: [{ url: "/" }],
    tags: [...TAGS],
  });
  return cachedDocument;
}
```

## The coverage test

```ts
// docs/registry.test.ts — the handlers are the truth; the document must match them both ways
const V1_ROOT = join(process.cwd(), "src/app/api/v1");
const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const UNPUBLISHED_PREFIXES = ["/api/v1/dev/"]; // local-only, deliberately out of the document

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return listRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

function toOpenApiPath(file: string): string {
  const segments = relative(V1_ROOT, file).split(sep).slice(0, -1);
  const path = segments.map((segment) => (segment.startsWith("[") ? `{${segment.slice(1, -1)}}` : segment)).join("/");
  return `/api/v1${path ? `/${path}` : ""}`;
}

const handlerRoutes = listRouteFiles(V1_ROOT)
  .flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return METHODS.filter((method) =>
      new RegExp(`export\\s+(?:async\\s+function|function|const)\\s+${method.toUpperCase()}\\b|as\\s+${method.toUpperCase()}\\b`).test(source),
    ).map((method) => ({ path: toOpenApiPath(file), method }));
  })
  .filter((route) => !UNPUBLISHED_PREFIXES.some((prefix) => route.path.startsWith(prefix)));

describe("the registry covers the API", () => {
  const document = getOpenApiDocument();

  it.each(handlerRoutes)("registers $method $path", ({ path, method }) => {
    expect(document.paths?.[path]?.[method]).toBeDefined();
  });

  it("registers no path the app doesn't serve", () => {
    const served = new Set(handlerRoutes.map((route) => route.path));
    expect(Object.keys(document.paths ?? {}).filter((path) => !served.has(path))).toEqual([]);
  });
});
```
