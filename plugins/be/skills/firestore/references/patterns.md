# Firestore — patterns

The shared helpers and commands behind `SKILL.md`.

## Contents

- [Cursor pagination](#cursor-pagination)
- [A transaction: uniqueness and a counter](#a-transaction-uniqueness-and-a-counter)
- [TTL — commands](#ttl--commands)
- [Security rules — helpers](#security-rules--helpers)
- [Security rules — a unit test](#security-rules--a-unit-test)
- [Rules and indexes — deploy](#rules-and-indexes--deploy)

## Cursor pagination

```ts
// baseQuery carries ONLY .where() clauses; the helper appends orderBy + a documentId tiebreaker.
const page = await getCursorPage({
  collectionPath: COLLECTIONS.notes,
  baseQuery: db.collection(COLLECTIONS.notes).where("ownerId", "==", ownerId),
  sortBy: "createdAt",
  sortOrder: "desc",
  cursor, // a document id
  dir,
  limit,
  parseDoc: (snapshot) => NoteListItemSchema.parse(toPlain(snapshot)), // Timestamp → ISO in toPlain
});
```

## A transaction: uniqueness and a counter

```ts
await db.runTransaction(async (tx) => {
  const existing = await tx.get(db.collection(COLLECTIONS.members).where("userId", "==", uid).limit(1));
  if (!existing.empty) throw new ConflictError("Already a member");
  const memberRef = db.collection(COLLECTIONS.members).doc();
  tx.create(memberRef, { ...member, createdAt: Timestamp.now() }); // known before commit
  tx.update(resourceRef, { memberCount: FieldValue.increment(1) }); // atomic counter
});
// After the commit, not inside: claims, emails, payments — a transaction can run more than once.
```

## TTL — commands

- Retention constants sit in one module keyed by collection; the writing service sets `expiresAt` from it.
- One TTL field per collection group, and each policy counts as a single-field configuration against the database's cap (200 without billing, 1,000 with it). Renaming the TTL field means disable, rename, backfill and recreate — so don't.
- Registering is idempotent and scriptable, and per project — run it for every tier:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=<group> --enable-ttl --async
```

- The first sweep after a policy turns active can take up to a day; each delete bills as a normal delete.

## Security rules — helpers

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
    function unchanged(field) { return request.resource.data[field] == resource.data[field]; }
    function onlyFields(fields) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields); }

    // Every document: nothing, unless a match below opens it on purpose.
    match /{document=**} { allow read, write: if false; }
  }
}
```

Pair `onlyFields` with an ownership check, and validate create and update with the same `isValidX()`.

## Security rules — a unit test

```ts
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";

const testEnv = await initializeTestEnvironment({
  projectId: "demo-rules", // a demo- id never reaches a real project
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});

it("denies every client read", async () => {
  const signedIn = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(getDoc(doc(signedIn, "events/event-1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "events/event-1")));
});
```

Seed data with `testEnv.withSecurityRulesDisabled`, clear it in `afterEach` with `testEnv.clearFirestore()`, and run the suite against the emulator in CI (`firebase emulators:exec --only firestore "pnpm test:rules"`). A rule that opens a path gets `assertSucceeds` cases for the callers it allows, beside the `assertFails` ones.

## Rules and indexes — deploy

- Deploy one part at a time: `firebase deploy --only firestore:rules`, `firebase deploy --only firestore:indexes`.
- `firebase firestore:indexes` prints the deployed indexes as JSON, to compare with the committed file.
- The index deploy asks before deleting indexes the file no longer lists; on production, answer no until no deployed code uses them, and never pass `--force`.
- A console edit to the rules is copied back to the file the same day; the next deploy overwrites it otherwise.
