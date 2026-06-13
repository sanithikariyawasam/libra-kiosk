import { supabase } from "@/lib/supabase-external";

export type BorrowedRow = {
  id: string;
  member_id: string;
  book_id: string;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
};

export function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function daysUntil(dueDate: string | null) {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Walk a member's active borrowed_books. Any past-due rows trigger:
 *  - book.status = 'overdue'
 *  - member.status = 'restricted'
 *  - restriction_history insert (if no active row exists for that book)
 * Idempotent.
 */
export async function detectAndApplyRestrictions(memberId: string) {
  const { data: borrowed } = await supabase
    .from("borrowed_books")
    .select("id, member_id, book_id, borrowed_at, due_date, returned_at")
    .eq("member_id", memberId)
    .is("returned_at", null);

  if (!borrowed || borrowed.length === 0) return { restricted: false };

  const overdueRows = (borrowed as BorrowedRow[]).filter((r) => isOverdue(r.due_date));
  if (overdueRows.length === 0) return { restricted: false };

  // Mark books overdue
  await Promise.all(
    overdueRows.map((r) =>
      supabase.from("books").update({ status: "overdue" }).eq("id", r.book_id),
    ),
  );

  // Fetch member info
  const { data: member } = await supabase
    .from("members")
    .select("id, uni_id, name, status")
    .eq("id", memberId)
    .maybeSingle();

  // Restrict member if not already
  if (member && member.status !== "restricted") {
    await supabase
      .from("members")
      .update({
        status: "restricted",
        restriction_reason: "Active Overdue Book",
        restricted_at: new Date().toISOString(),
      })
      .eq("id", memberId);
  }

  // Insert restriction history rows (one per overdue book) if none active
  for (const row of overdueRows) {
    const { data: existing } = await supabase
      .from("restriction_history")
      .select("id")
      .eq("member_id", memberId)
      .eq("book_id", row.book_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) continue;

    const { data: book } = await supabase
      .from("books")
      .select("title")
      .eq("id", row.book_id)
      .maybeSingle();

    await supabase.from("restriction_history").insert({
      member_id: memberId,
      uni_id: member?.uni_id ?? null,
      member_name: member?.name ?? null,
      book_id: row.book_id,
      book_title: book?.title ?? null,
      reason: "Active Overdue Book",
      due_date: row.due_date,
      status: "active",
      restricted_at: new Date().toISOString(),
    });
  }

  return { restricted: true };
}
