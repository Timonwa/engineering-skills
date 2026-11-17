# Field encryption — the code

The primitive with associated data and a key per version, and the service boundary around it.

## Contents

- [Encrypt and decrypt](#encrypt-and-decrypt)
- [The service boundary](#the-service-boundary)
- [A blind index](#a-blind-index)

## Encrypt and decrypt

```ts
// server/utils/encryption.utils.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/config/env"; // each key validated as /^[0-9a-f]{64}$/i at boot

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const CURRENT_VERSION = "v1";

// One entry per live version; a rotation adds v2 here before encrypt switches to it.
const KEYS: Record<string, () => Buffer> = {
  v1: () => Buffer.from(env.FIELD_ENCRYPTION_KEY_V1, "hex"),
};

// The context ties a ciphertext to its place, so a copy pasted into another record fails the tag.
export const buildFieldContext = (collection: string, documentId: string, field: string) =>
  Buffer.from(`${collection}/${documentId}#${field}`, "utf8");

export function encryptField(plaintext: string | null, context: Buffer): string | null {
  if (plaintext === null) return null;
  const nonce = randomBytes(NONCE_BYTES); // fresh every call — never passed in
  const cipher = createCipheriv(ALGORITHM, KEYS[CURRENT_VERSION]!(), nonce);
  cipher.setAAD(context);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [CURRENT_VERSION, nonce.toString("hex"), cipher.getAuthTag().toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptField(stored: string | null, context: Buffer): string | null {
  if (stored === null) return null;
  const [version, nonceHex, tagHex, ciphertextHex, ...rest] = stored.split(":");
  const getKey = version ? KEYS[version] : undefined;
  if (!getKey || !nonceHex || !tagHex || ciphertextHex === undefined || rest.length > 0) {
    throw new InternalServerError("Failed to read encrypted field", new Error("unrecognised ciphertext format"));
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(nonceHex, "hex"), { authTagLength: 16 });
    decipher.setAAD(context);
    decipher.setAuthTag(Buffer.from(tagHex, "hex")); // before final(), or GCM can't verify
    return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
  } catch (cause) {
    throw new InternalServerError("Failed to read encrypted field", cause); // the cause goes to the log only
  }
}
```

## The service boundary

```ts
// resource.service.ts
const accessCodeContext = (resourceId: string) => buildFieldContext("resources", resourceId, "accessCode");

function hydrateResource(stored: StoredResource): Resource {
  return { ...stored, accessCode: decryptField(stored.accessCode, accessCodeContext(stored.id)) };
}

export async function updateResource(resourceId: string, input: UpdateResource): Promise<Resource> {
  const existing = await readResource(resourceId);
  const writes: Partial<StoredResource> = { ...input };
  if (input.accessCode !== undefined) {
    writes.accessCode = encryptField(input.accessCode, accessCodeContext(resourceId));
  }
  await writeResource(resourceId, writes);

  const updated = hydrateResource({ ...existing, ...writes });
  // writes.accessCode is ciphertext bound for the store — return what the caller sent.
  if (input.accessCode !== undefined) updated.accessCode = input.accessCode;
  return updated;
}

// An operator's projection: a summary, never the value.
export const toOperatorPayout = (payout: StoredPayout) => ({
  bankName: payout.bankName,
  accountNumberLastFour: decryptField(payout.accountNumber, payoutContext(payout.id))?.slice(-4) ?? null,
});
```

## A blind index

```ts
import { createHmac } from "node:crypto";

// Its own key: never the field key.
export const buildBlindIndex = (value: string) =>
  createHmac("sha256", Buffer.from(env.BLIND_INDEX_KEY, "hex")).update(value.trim().toLowerCase()).digest("hex");

// Stored beside the ciphertext and queried on: where("taxIdIndex", "==", buildBlindIndex(input.taxId))
```
