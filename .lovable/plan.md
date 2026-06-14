# Batch 3 (ACCA) Onboarding — Implementation Plan

Ships in two phases so Batch 1/2 stay safe at every step. 15 ACCA students from the uploaded sheet will be seeded into Batch 3.

## Phase A — Batch visibility + sponsored access + RLS

### 1. Schema changes (migration)

Add to `batches`:
- `access_granted boolean default false`
- `is_partner boolean default false`
- `sponsor_organization text` (default for new students in batch)

Add to `students`:
- `sponsor_organization text`

New join tables (each with `(content_id, batch_id)` PK, `created_at`):
- `course_batches`
- `module_batches` (→ `course_modules`)
- `video_batches` (→ `video_materials`)
- `document_batches` (→ `course_documents`)
- `announcement_batches` (extends existing audience targeting; existing `target_audience` field kept as fallback)

Each gets `GRANT` + RLS: admins manage all, authenticated students read rows for their own batch.

### 2. Backfill (same migration)

- Assign every existing `course_modules`, `video_materials`, `course_documents`, `announcements`, and course row to **Batch 1 and Batch 2 only** (whatever batches currently exist except the new Batch 3). Batch 3 starts empty.
- Create Batch 3: `name='Batch 3 — ACCA Edition'`, `start_date=2026-06-15`, `access_granted=true`, `is_partner=true`, `sponsor_organization='ACCA Organization'`.

### 3. New access helper (security definer)

```
public.has_full_access(_user_id uuid) returns boolean
```
True if: individually paid (existing `is_paid_student` logic) OR student's batch has `access_granted=true` OR student's `sponsor_organization` is set.

### 4. RLS rewrites

For `course_modules`, `video_materials`, `course_documents`, `announcements`, `courses` (if it exists):
- Drop/replace existing student SELECT policies.
- New student SELECT policy: row visible only if there is a matching `*_batches` row for the student's `batch_id`.
- Admin policies unchanged.

`PaidAccessGate` and `StudentLayout` updated to use `has_full_access` so Batch 3 sees no paywall.

### 5. Admin UI — "Visible to batches" multi-select

Reusable `<BatchMultiSelect />` component added to the create/edit forms of:
- `src/pages/admin/Modules.tsx`
- `src/pages/admin/VideoMaterials.tsx`
- Documents admin (in `MyCourses` or wherever documents are managed)
- `src/pages/admin/Announcements.tsx` (alongside existing audience targeting)
- Course admin (if applicable)

Saved as chips; selection alone controls sharing vs exclusivity.

### 6. Batch management UI

`src/pages/admin/BatchDetail.tsx` gains:
- "Grant full access (sponsored / partner batch)" switch → `access_granted`
- "Partner batch" switch → `is_partner`
- "Sponsoring organization" text input → applies to batch + bulk-updates all students in batch

### 7. Seed Batch 3 students

Insert 15 ACCA students from the spreadsheet (name, email, phone) into `students` with `batch_id` = Batch 3, `status='active_student'`, `sponsor_organization='ACCA Organization'`. Use existing `enroll-and-invite` edge function so each gets an auth account + welcome email.

Seed the Batch 3 "Introduction" content (single module/announcement) tagged only to Batch 3.

## Phase B — Bulk email to a batch

### 1. Admin page `src/pages/admin/EmailBatch.tsx` (route `/admin/email-batch`)

- Select batch dropdown → shows recipient count
- Template dropdown (3 seeded templates below) with editable subject + body
- Live preview with sample variables filled in
- "Send" → calls new edge function `send-batch-email`

### 2. Edge function `supabase/functions/send-batch-email/index.ts`

- Auth check (admin only via `has_admin_section`)
- Loads batch students, renders template per recipient with `{{first_name}}`, `{{batch_name}}`, `{{class_date}}`, `{{class_time}}`, `{{join_link}}`, `{{dashboard_url}}`
- Sends via existing Resend connector
- Logs each send in `email_logs`; logs the bulk run in new `batch_email_runs` table (batch_id, template_name, subject, recipient_count, status, sent_at, admin_id)

### 3. Seeded templates (in code constants, editable in UI)

- **Classes Start Tomorrow (full)** — long version
- **Warm reminder** — medium
- **Short nudge** — short
(text exactly as you provided)

## Technical notes

- All schema changes go through one migration; RLS swap and backfill happen in the same transaction so no window of broken visibility.
- `course_batches` only created if a `courses` table exists — otherwise skipped (your current model centers on `course_modules`).
- Email variables resolved server-side; HTML escaped; idempotency key per (run, recipient).
- Existing announcement `target_audience` (all/active/enrolled) still respected on top of the batch filter so older un-tagged announcements continue to work.

## Acceptance check after shipping

1. Log in as a Batch 2 student → identical content to before.
2. Log in as a Batch 3 student → only the Introduction visible, no paywall.
3. Tag a module to Batch 2 + Batch 3 → both see it.
4. Direct PostgREST request from Batch 3 user for a Batch 2 module → 0 rows (RLS).
5. Admin sends "Classes Starting Tomorrow" to Batch 3 → 15 recipients logged.

---

This is a sizable change set. Want me to proceed with Phase A first (you'll be able to verify Batch 1/2 untouched + Batch 3 empty + ACCA students seeded), then Phase B right after? Or ship both in one go?
