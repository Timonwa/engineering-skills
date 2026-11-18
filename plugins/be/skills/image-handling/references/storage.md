# Firebase Storage — buckets and client uploads

The two-bucket setup and the rule-gated client upload, with the commands that check them.

## Reserve, then upload (client-direct, rule-gated)

1. Server `POST …/reserve` → creates the Firestore attachment doc at `resources/{resourceId}/attachments/{attachmentId}` with `{ uploadedBy, status: "pending" }`, returns `{ attachmentId, storagePath }`.
2. Client `uploadBytesResumable(ref(storage, storagePath), file)` to the reserved path.
3. Storage rule validates each write against the reserved doc:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{ownerId}/resources/{resourceId}/attachments/{attachmentId}/{file} {
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/resources/$(resourceId)/attachments/$(attachmentId)).data.uploadedBy == request.auth.uid
        && request.resource.size < 100 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|heic|heif|webp)');
      allow read: if false;   // originals served via signed URL
    }
  }
}
```

Public bucket: `allow read: if true; allow write: if false;` + IAM `allUsers → Object Viewer` + Uniform Bucket-Level Access (UBLA) on (no `makePublic()`).

## Buckets — deploy and checks

- Deploy targets are **per-machine CLI state**: run `firebase target:apply storage <target> <bucket>` once per machine and in CI; the committed `.firebaserc` only describes the mapping. Deploy one bucket's rules with `firebase deploy --only storage:<target>`.
- "Upload succeeds, every fetch 403s" means one of the two **Google Cloud console-only** steps is missing on the public bucket (neither is in the Firebase console): the `allUsers → Storage Object Viewer` grant, or uniform bucket-level access. Check both:

```bash
gcloud storage buckets get-iam-policy gs://<public-bucket>   # allUsers must hold roles/storage.objectViewer
gcloud storage buckets describe gs://<public-bucket> \
  --format="value(iamConfiguration.uniformBucketLevelAccess.enabled)"   # must print True
```

- Under uniform bucket-level access, `makePublic()` throws; public read comes from the bucket's IAM grant, never per-object ACLs.
