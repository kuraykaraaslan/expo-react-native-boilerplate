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
- [ ] `services/platform/storage.{dto,service.client}.ts`: `upload`, `getUsage`.
- [ ] Avatar: profile screen picks → crops/compresses → uploads → `PUT /auth/me/profile` with the returned URL/id (confirm which field the profile accepts). Show progress and a failure state with retry.

## 15.2 Media gallery (optional)

- [ ] Entity-attached galleries: `GET/POST /media-gallery/[entityType]/[entityId]/items`, reorder, primary image, delete. Only wire this where a screen actually needs it; a reusable `MediaGalleryEditor` component is the deliverable, not a standalone screen.

## 15.3 Drive (optional)

- [ ] Browser over `GET /drive` (folders, breadcrumb), upload (`POST /drive/upload`), rename/move/trash/restore (`[driveFileId]` + `actions`), shares and public link, trash view, preview via `GET …/preview` (images/PDF in-app, others via the OS share/open sheet using `expo-sharing` / `expo-file-system`).
- [ ] Downloads go to the app cache; sharing to other apps uses the system share sheet.

## Files touched / created

- New: `libs/upload.ts`, `services/platform/storage.*`, `components/media/*`, optionally `app/(drawer)/drive/*`
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

## 🟡 CODED (15.1 only) — 2026-10-09

**Contract check (server source):** `POST /storage` (`storage.route.ts`) takes multipart `file`, `folder` (default `general`), optional `provider`, and answers `{message, uploadedFileId, url, key, bucket, size, provider}`; `GET /storage/usage` answers `{usedBytes, quotaBytes, remainingBytes}` (`-1` = unlimited). `storage.validation` checks size, extension and magic bytes server-side. The profile takes the file's `url` in `profilePicture` (`user_profile.dto`, nullable string).

**Built:** `expo-image-picker` + `expo-image-manipulator` (SDK-57 versions, plugin permission strings in `app.config.ts`), `libs/pickImage.ts` (camera/library, square crop, 512 px JPEG q0.8), `libs/upload.ts` (`checkUpload`, `buildUploadForm`), `services/platform/storage.*`, `components/account/AvatarPicker.tsx` (progress, cancel via `AbortController`) wired into `ProfileCard` (the new photo is saved to the profile immediately). Tests: `__tests__/upload.test.ts`.

**Deliberate deviations:**
- `Content-Type: multipart/form-data` **is** set on the upload request (without a boundary). The shared axios instance defaults to `application/json`, which axios would keep for a React Native `FormData`; the bare multipart type makes RN add the boundary itself. This replaces "do not set Content-Type manually" from the task list.
- Upload timeout is 120 s (the instance default of 10 s is for JSON calls).
- The size limit is a client default (10 MB); the real limit is a tenant setting the client cannot read, so a server `FILE_TOO_LARGE` is surfaced as returned.
- 15.2 (media gallery) and 15.3 (drive) were not started; both are optional.
- Needs a development build (new native modules, P3); not verified on a device. The "shows on the web profile" criterion needs a live check.

