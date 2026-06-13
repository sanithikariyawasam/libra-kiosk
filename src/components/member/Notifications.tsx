import { useLibrary, type Book } from "@/context/LibraryContext";
import { isOverdue, daysUntil } from "@/lib/overdue";

export default function MemberNotifications() {
  const { currentUser, books } = useLibrary();
  if (!currentUser) return null;

  const myBooks: Book[] = books.filter((b) => currentUser.borrowed.includes(b.id));
  const overdue = myBooks.filter((b) => isOverdue(b.due_date));
  const dueSoon = myBooks.filter((b) => {
    if (isOverdue(b.due_date)) return false;
    const d = daysUntil(b.due_date);
    return d !== null && d <= 3;
  });

  const restricted = currentUser.status === "restricted";
  if (!restricted && overdue.length === 0 && dueSoon.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-6">
      {restricted && (
        <div className="border-2 border-destructive bg-destructive/10 rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚫</span>
            <h3 className="font-serif text-lg font-bold text-destructive">ACCOUNT RESTRICTED</h3>
          </div>
          <p className="text-sm text-ink mb-2">
            Your account is currently restricted{currentUser.restriction_reason ? ` — ${currentUser.restriction_reason}` : ''}.
          </p>
          <p className="text-xs text-ink2">
            You cannot borrow books or create new reservations until a librarian removes this restriction.
            You can still view your account and cancel existing reservations.
          </p>
        </div>
      )}

      {overdue.map((b) => {
        const daysOver = Math.abs(daysUntil(b.due_date) ?? 0);
        return (
          <div key={b.id} className="border-l-4 border-destructive bg-destructive/5 rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>🚨</span>
              <strong className="text-destructive font-serif">BOOK OVERDUE</strong>
            </div>
            <div className="text-sm text-ink font-medium">{b.title}</div>
            <div className="text-xs text-ink2 mt-1">
              Due {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'} · {daysOver} day{daysOver === 1 ? '' : 's'} overdue
            </div>
          </div>
        );
      })}

      {dueSoon.map((b) => {
        const remaining = daysUntil(b.due_date) ?? 0;
        return (
          <div key={b.id} className="border-l-4 border-yellow-500 bg-yellow-50 rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>⚠️</span>
              <strong className="text-yellow-800 font-serif">BOOK DUE SOON</strong>
            </div>
            <div className="text-sm text-ink font-medium">{b.title}</div>
            <div className="text-xs text-ink2 mt-1">
              Due {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'} · {remaining} day{remaining === 1 ? '' : 's'} remaining
            </div>
          </div>
        );
      })}
    </div>
  );
}
