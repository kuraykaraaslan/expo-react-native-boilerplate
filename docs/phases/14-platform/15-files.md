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

**Correction 2026-10-10 (review of the above):** the upload folder is `users`, not `avatars`. The server only accepts a folder from `StorageFolderSchema` (`general`, `users`, `images`, …) or one a module registers; `avatars` would have been rejected with `INVALID_FOLDER_NAME` on every upload. The profile callback also reads the form at the moment the upload ends (it used a stale copy), and a running upload is aborted when the screen unmounts.


---

## 🟡 CODED (15.2) — 2026-10-10

**Contract check (server source, `modules/media_gallery/server`):** `GET /media-gallery/{entityType}/{entityId}/items` answers `{ gallery: { galleryId, entityType, entityId, items[] } }` (the gallery is created on first read; items are primary first, then by sort order; each item carries the resolved `url`, `mimeType`, `isVideo`). `POST …/items` takes `AddGalleryItemDTO` (`uploadedFileId` uuid required, optional alt text, title, tags, sort order, primary) and answers 201 `{ item }`. `PUT /media-gallery/items/{itemId}` takes `UpdateGalleryItemDTO` and answers `{ item }`; setting `isPrimary` clears the flag on the other items under a gallery lock. `DELETE /media-gallery/items/{itemId}` answers `{ success }`. `PUT …/items/reorder` takes `{ galleryId, orderedIds }` (the entity path segments are not used by the handler) and answers `{ success }`. Permissions are `media_gallery.items.read/create/update/delete/reorder`; the entity type is an open slug (`^[a-z][a-z0-9_]*$`).

**Built:** `components/media/MediaGalleryEditor.tsx` (props `entityType`, `entityId`, `readOnly`; grid, add from camera or library with progress and cancel, move earlier/later, make primary, delete behind `ConfirmDialog`), `services/platform/mediaGallery.{dto,service.client}.ts`, `utils/mediaGallery.ts` (ordering helpers), `MEDIA_GALLERY` keys in all six locales. `libs/pickImage.ts` now exports `pickImage(source, { crop, aspect, widthPx, namePrefix })`; `pickAvatarImage` is a wrapper with the unchanged avatar settings (square crop, 512 px, `avatar-*.jpg`). Uploads go through `StorageClientService.upload` into the `images` folder, then the returned `uploadedFileId` is attached. Tests: `__tests__/mediaGallery.test.ts` (service paths and bodies with MSW, ordering helpers, `pickImage`/`pickAvatarImage` options).

**Behaviour:**
- One mutation at a time (add, reorder, primary, delete). Reorder is shown at once and put back if the server refuses; any failed mutation reloads the list from the server.
- Answers that arrive after the organization, entity type or entity id changed are dropped (same rule as `libs/realtime.ts`); the list is cleared and reloaded on such a change, and a running upload is aborted.
- The primary item always stays first (the server lists it first whatever its sort order), so reordering never moves an item across it.

**Deviations and gaps:**
- The deliverable is the component, not a screen: nothing in the app mounts it yet.
- Reorder uses earlier/later buttons, not drag and drop (no gesture/drag dependency is installed).
- Alt text, title and tags are not editable in the app; the server may fill alt text itself when configured.
- Images only. Video items already in a gallery are shown as a text tile; video capture and upload are not built.
- The per-gallery item cap and allowed MIME list are tenant settings the client cannot read; a server rejection (`ITEM_LIMIT_REACHED`, `MIME_NOT_ALLOWED`, safety scan) is surfaced as returned. If the attach step fails after the upload succeeded, the stored file stays unattached (no client-side delete route is used).
- Not verified: there is no component render test (the repo has no component test setup), so the editor's UI behaviour, the Zod shapes against a live server and the camera/library flow on a device are unverified. Needs a development build.

**Review 2026-10-10 (MediaGalleryEditor):** the server contract (paths, bodies, `{ gallery }`/`{ item }` answers, open entity slug, `images` folder, reorder `galleryId` in the body) was re-checked against `modules/media_gallery` and `modules/storage` and is correct, and all `MEDIA_GALLERY`/`UPLOAD`/`COMMON` keys exist in the six locales. One real bug fixed: when a reorder failed after an organization switch, the catch block put the old organization's photos back into the new organization's list (and the success haptic fired for the stale scope). Both are now guarded by the scope check. Added `__tests__/mediaGalleryEditor.test.tsx`, the first component render test (React Native Testing Library; FontAwesome, expo-image, haptics and the service are mocked): stale list answer after a switch, the failed-reorder case above (fails without the fix), and the read-only mode. Still not covered by tests: the add flow (picker, upload, attach), delete confirmation and primary change. Still not verified on a device.
