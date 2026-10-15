<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/storage/{module.json,server/storage.route.ts} · modules/media_gallery · modules/drive
  3. docs/phases/README.md
  4. docs/phases/14-platform/README.md (P1, P3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 15 — Uploads, avatar, media gallery and drive

**Goal:** The app can upload a file or photo, the profile avatar uses it, and users can browse, upload to and share from their drive.

Modules: `storage`, `media_gallery`, `drive`. Priority 2. Build 15.1 first; 15.2 and 15.3 are optional follow-ups.

## 15.1 Storage upload and avatar

- [ ] Contract: `POST /api/storage` takes **multipart form data** (`file`, `folder`, `provider`), validates MIME from content and may virus-scan; `GET /api/storage/usage` reports quota. Read `storage.route.ts`, the DTO and the response (public URL vs. `UploadedFile` id).
- [ ] Add `expo-image-picker` (camera + library) and `expo-image-manipulator` (resize/compress before upload). Permission strings in `app.config.ts`.
- [ ] `libs/upload.ts`: build `FormData` with `{uri, name, type}` parts; **do not set `Content-Type` manually** (axios/RN add the boundary); progress callback; cancel via `AbortController`; size and type pre-checks matching the server limits.
- [ ] `modules/platform/storage.{dto,service.client}.ts`: `upload`, `getUsage`.
- [ ] Avatar: profile screen picks → crops/compresses → uploads → `PUT /auth/me/profile` with the returned URL/id (confirm which field the profile accepts). Show progress and a failure state with retry.

## 15.2 Media gallery (optional)

- [ ] Entity-attached galleries: `GET/POST /media-gallery/[entityType]/[entityId]/items`, reorder, primary image, delete. Only wire this where a screen actually needs it; a reusable `MediaGalleryEditor` component is the deliverable, not a standalone screen.

## 15.3 Drive (optional)

- [ ] Browser over `GET /drive` (folders, breadcrumb), upload (`POST /drive/upload`), rename/move/trash/restore (`[driveFileId]` + `actions`), shares and public link, trash view, preview via `GET …/preview` (images/PDF in-app, others via the OS share/open sheet using `expo-sharing` / `expo-file-system`).
- [ ] Downloads go to the app cache; sharing to other apps uses the system share sheet.

## Files touched / created

- New: `libs/upload.ts`, `modules/platform/storage.*`, `components/media/*`, optionally `app/(drawer)/drive/*`
- Changed: `app/(drawer)/settings/profile.tsx`, `app.config.ts`, `package.json`, `locales/*.json`
- Test: FormData construction (no manual content type), oversize/invalid-type rejection, avatar update flow with MSW

## Reuse

- Phase 2 transport (bearer + tenant prefix apply to uploads too); `@/components/ui` `Avatar`, `Spinner`, `Modal`; haptics on success.

## Acceptance criteria

- A photo from the camera or library becomes the avatar and shows on the web profile.
- An oversize or disallowed file is rejected before upload with a clear message; a server rejection is surfaced verbatim.
- Cancelling mid-upload leaves no half-created record on the client.
- `npm run registry:snapshot` is up to date.

## Risks

- **Large files on mobile data.** Compress images; warn before big uploads; never upload on a metered connection without a user action.
- **Manual `Content-Type`** breaks multipart boundaries on RN.
- **Local file lifetime.** Picker URIs can be cache paths that disappear; copy into the app cache before queuing a retry.
- **Quota and plan gates** (`feature_gate`, Phase 14) can reject uploads; map the error.

---

## ✅ CODED (15.1 upload + avatar) — 2026-10-15 · 15.2 and 15.3 not built

On `main`. Typecheck 0 errors, jest 310/310 (5 new), web export OK. Screenshots: `.junk/screenshots/phase-15-files/` (4 images, from the web build with the browser's file chooser standing in for the picker).

**Corrections to this plan** (read from `storage` and `account` server source)
- **The shared axios instance defaults to `Content-Type: application/json`, and axios converts a FormData body to JSON when it sees that header.** The plan's "do not set Content-Type manually" is therefore wrong *for this instance*: the upload sets `multipart/form-data` explicitly (the platform adds the boundary), and a test pins that the request is multipart, not JSON.
- `POST /storage` is `scope: 'ACCOUNT'` (any signed-in user, `storage.files.upload`), multipart `file` + optional `folder` + optional `provider`, and answers `{message, uploadedFileId, url, key, bucket, size, provider}`. **The size/type limits are per-tenant settings (`maxFileSizeMb`, `allowedMimeTypes`, …) that no API exposes**, so the app cannot pre-check them; it only refuses non-images and absurd sources and shows the server's own message otherwise.
- The profile takes the avatar as a **URL string** in `profilePicture`, and the PUT requires all five profile keys (nullable) — the existing profile form already sends them all.

**What shipped**
- `modules/storage/storage.{dto,service.client}.ts`: `StorageClientService.upload` (60 s timeout; a Blob on web, `{uri,name,type}` on native).
- `libs/upload.ts` (sanity checks), `libs/avatar.ts`: pick (camera or library, square crop) → resize to 512 px JPEG (q 0.8) → upload to `avatars/` → URL. Handles camera-permission denial, non-image and oversize sources, and cancel.
- Profile card: **Change photo** menu (Take photo / Choose from library / Remove photo), busy state, and a toast "Photo uploaded. Save to apply it." — the photo is applied with the profile's own Save, so an upload never silently saves half-edited fields.
- New packages `expo-image-picker`, `expo-image-manipulator` (+ the image-picker config plugin with the permission strings; needs a development build). Strings in all six languages (`user` dictionary).

**Deliberate deviations**
- **15.2 media gallery and 15.3 drive were not built** (the plan marked them optional; no screen needs them yet). Only the shared upload service exists for them to reuse.
- No upload progress bar or cancel (a single small file after resizing); no retry queue.
- The previous avatar file is not deleted from storage when replaced or removed.
- `manipulateAsync` is used (still available in SDK 57); the newer contextual API can replace it later.

**Not verified:** nothing ran against a live server, the real camera, the photo library or a device; the multipart body of a React Native `{uri,name,type}` part is only exercised on device. Whether the server accepts `.jpg` uploads into an `avatars` folder under every tenant's allow-list is unknown.
