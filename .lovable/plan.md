# LibraKiosk: Restrictions + Reservation Management

This is a large, multi-area change. Below is the proposed scope, broken into deliverables. After approval I'll execute end-to-end.

## 1. Database changes (one migration)

Add columns and tables on the external Supabase project (`skidrbtiqaouhnvyyiox`). Per project rules, I'll add `due_date` to `borrowed_books` if missing and use it consistently.

**`members` — new columns**
- `status` ('active' | 'restricted'), default 'active'
- `restriction_reason` text nullable
- `restricted_at` timestamptz nullable

**`reservations` — new columns**
- `status` ('active' | 'collected' | 'cancelled' | 'expired'), default 'active'
- `type` ('library' | 'kiosk'), default 'library'
- `compartment` text nullable
- `cancelled_at` timestamptz nullable
- `cancellation_reason` text nullable

**New `restriction_history` table**
- id, member_id, uni_id, member_name, book_id, book_title
- reason, due_date, return_date, days_overdue
- status ('active' | 'cleared')
- restricted_at, cleared_at, cleared_by_admin (email)

**New `reservation_history` table**
- id, member_id, book_id, type, reserved_at, expires_at
- status, cancelled_at, cancellation_reason

All new tables get appropriate public read/write policies consistent with current schema.

## 2. Automatic overdue detection

Implemented client-side on dashboard load + admin refresh (no cron needed for prototype):
- For each `borrowed_books` row where `returned_at` is null and `due_date < now()`: set book `status='overdue'`, set member `status='restricted'`, insert `restriction_history` row if not already active.
- On Mark-as-Returned for an overdue book: compute days_overdue, update history with return_date + days_overdue, change reason to "Overdue Return", keep member restricted.

## 3. Member Dashboard

`src/components/MainApp.tsx` (or a new `MemberDashboard.tsx`) gets a Notifications section at top:
- Red **Account Restricted** banner (if member.status='restricted') with reason, book, due date, days overdue.
- Red **Overdue Book** cards.
- Yellow **Due Soon** cards (≤3 days remaining).
- Reserve/Borrow actions: don't hide — when restricted, clicking shows an "Action Failed" modal.

## 4. My Reservations page

New `src/pages/MyReservations.tsx` linked from member nav:
- Lists active reservations with status badges (Active/Collected/Cancelled/Expired — color coded).
- Library: shows weeks/days remaining. Kiosk: live MM:SS countdown + compartment.
- **Cancel Reservation** button with confirm modal → sets reservation status='cancelled', book back to 'available', clears compartment if kiosk, writes `reservation_history`.
- Client-side expiration check: when timer hits 0, mark expired + free book/compartment.

## 5. Reservation popups

Update `ReserveModal.tsx` (and add a kiosk variant or branch) to show:
- Library: 2 weeks period, pickup = Main Library.
- Kiosk: 1 hour period, compartment, pickup = LibraKiosk.
- Post-confirm success toast/modal with collection info.

Library reservation duration changes from existing 1-week shelf to **2 weeks** per spec.

## 6. Admin Dashboard

Add 4th tab **🚫 Restrictions** in `src/pages/Admin.tsx`:
- Stats row: Active Restricted, Due Soon, Overdue, Cleared This Month.
- Table: Student ID, Name, Book, Reason, Due Date, Return Date, Days Overdue, Status.
- Search by uni_id/name; filter Active/Cleared; sort by days overdue or restriction date.
- Row click → details drawer/modal with full info, restriction history for member, and **Remove Restriction** button → sets member active, marks history cleared with admin email + timestamp.

## 7. Design

Reuse existing paper aesthetic. Status colors:
- Red = restriction/overdue, Yellow = due soon, Orange = overdue warning card, Green = cleared/active OK, Blue = reservation info.

## Files to create
- `src/pages/MyReservations.tsx`
- `src/components/member/Notifications.tsx`
- `src/components/member/RestrictionBanner.tsx`
- `src/components/member/ActionBlockedModal.tsx`
- `src/components/admin/RestrictedMembers.tsx`
- `src/components/admin/RestrictionDetailsModal.tsx`
- `src/lib/overdue.ts` (shared detection helper)

## Files to edit
- `src/App.tsx` (route `/member/reservations`)
- `src/context/LibraryContext.tsx` (status, reservation flows, cancel, expiration)
- `src/components/MainApp.tsx` (notifications, blocked actions)
- `src/components/ReserveModal.tsx` (2-week library, kiosk variant)
- `src/pages/Admin.tsx` (4th tab)
- `src/integrations/supabase/types.ts` (auto-regen after migration)

## Out of scope (confirm if you want included)
- Server-side cron for expirations (currently handled lazily on load).
- Email/SMS notifications.
- Renew-book flow (spec mentions "renew" but doesn't define it).

Approve and I'll run the migration first, then implement all UI/logic.
