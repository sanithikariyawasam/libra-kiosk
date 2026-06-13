import { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-external";
import { useLibrary, LibraryProvider } from "@/context/LibraryContext";
import { toast } from "sonner";

type Row = {
  id: string;
  book_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'active' | 'collected' | 'cancelled' | 'expired';
  type: 'library' | 'kiosk';
  compartment: string | null;
  book_title: string;
  book_author: string;
};

function statusBadge(s: Row['status']) {
  const map: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    collected: "bg-green-100 text-green-700",
    cancelled: "bg-gray-200 text-gray-700",
    expired: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-1 rounded-full uppercase font-bold ${map[s]}`}>
      {s}
    </span>
  );
}

function libraryRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  if (weeks > 0 && remDays > 0) return `${weeks} Week${weeks > 1 ? 's' : ''} ${remDays} Day${remDays > 1 ? 's' : ''}`;
  if (weeks > 0) return `${weeks} Week${weeks > 1 ? 's' : ''}`;
  return `${days} Day${days !== 1 ? 's' : ''} Remaining`;
}

function kioskRemaining(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function MyReservationsContent() {
  const { currentUser, cancelReservation } = useLibrary();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [confirmCancel, setConfirmCancel] = useState<Row | null>(null);
  const expiringRef = useRef<Set<string>>(new Set());

  const fetchRows = async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data: res } = await supabase
      .from("reservations")
      .select("id, book_id, reserved_at, expires_at, status, type, compartment")
      .eq("member_id", currentUser.id)
      .order("reserved_at", { ascending: false });

    const enriched: Row[] = await Promise.all(
      ((res as any[]) ?? []).map(async (r) => {
        const { data: b } = await supabase.from("books").select("title, author").eq("id", r.book_id).maybeSingle();
        return {
          id: r.id,
          book_id: r.book_id,
          reserved_at: r.reserved_at,
          expires_at: r.expires_at,
          status: (r.status ?? 'active') as Row['status'],
          type: (r.type ?? 'library') as Row['type'],
          compartment: r.compartment ?? null,
          book_title: b?.title ?? '—',
          book_author: b?.author ?? '—',
        };
      })
    );
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [currentUser]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-expire reservations
  useEffect(() => {
    rows.forEach(async (r) => {
      if (r.status !== 'active') return;
      if (new Date(r.expires_at).getTime() > now) return;
      if (expiringRef.current.has(r.id)) return;
      expiringRef.current.add(r.id);

      await supabase.from("reservations").update({ status: 'expired' }).eq("id", r.id);
      await supabase.from("books")
        .update({ status: r.type === 'kiosk' ? 'kiosk' : 'available' })
        .eq("id", r.book_id);
      await supabase.from("reservation_history").insert({
        reservation_id: r.id, member_id: currentUser?.id, book_id: r.book_id,
        type: r.type, expires_at: r.expires_at, status: 'expired',
      });
      toast.info(`⌛ Reservation for "${r.book_title}" expired.`);
      fetchRows();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, rows]);

  const doCancel = async () => {
    if (!confirmCancel) return;
    await cancelReservation(confirmCancel.id, confirmCancel.book_id, confirmCancel.compartment);
    toast.success("✅ Reservation cancelled successfully");
    setConfirmCancel(null);
    fetchRows();
  };

  if (!currentUser) return <Navigate to="/member" replace />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-ink text-cream px-10 flex items-center justify-between h-16 sticky top-0 z-[100]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📚</span>
          <h2 className="font-serif text-lg font-bold">LibraKiosk</h2>
        </div>
        <Link to="/member" className="text-xs text-cream/70 hover:text-cream">← Back to Dashboard</Link>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <h1 className="font-serif text-3xl font-black text-ink mb-2">My Reservations</h1>
        <p className="text-sm text-ink2 mb-8">Active reservations, countdown timers and cancellation.</p>

        {loading ? <p className="text-center text-ink2 py-10">Loading...</p> :
          rows.length === 0 ? <p className="text-center text-ink2 py-10">You have no reservations yet.</p> :
          <div className="flex flex-col gap-4">
            {rows.map((r) => {
              const isActive = r.status === 'active';
              const isKiosk = r.type === 'kiosk';
              return (
                <div key={r.id} className="bg-card border border-border rounded-[14px] p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-xs font-mono text-ink2 mb-1">
                        {isKiosk ? '📦 LIBRAKIOSK' : '📚 MAIN LIBRARY'}
                        {isKiosk && r.compartment && <span className="ml-2">· Compartment {r.compartment}</span>}
                      </div>
                      <div className="font-serif text-lg font-bold text-ink">{r.book_title}</div>
                      <div className="text-xs text-ink2 italic">by {r.book_author}</div>
                    </div>
                    {statusBadge(r.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div>
                      <div className="text-ink2 uppercase tracking-wider text-[10px] mb-0.5">Reserved</div>
                      <div className="text-ink font-mono">{new Date(r.reserved_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-ink2 uppercase tracking-wider text-[10px] mb-0.5">Time Remaining</div>
                      <div className={`font-mono font-bold ${isActive ? 'text-blue-600' : 'text-ink2'}`}>
                        {isActive ? (isKiosk ? kioskRemaining(r.expires_at, now) : libraryRemaining(r.expires_at)) : '—'}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => setConfirmCancel(r)}
                      className="bg-destructive text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90"
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        }
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5 backdrop-blur-[4px]">
          <div className="bg-paper border border-border rounded-[20px] p-8 max-w-md w-full">
            <h3 className="font-serif text-xl font-bold mb-2">Cancel Reservation?</h3>
            <p className="text-sm text-ink2 mb-2">
              Are you sure you want to cancel your reservation for:
            </p>
            <p className="font-serif font-bold text-ink mb-6">{confirmCancel.book_title}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 bg-warm border border-border rounded-lg py-2.5 text-sm">
                Keep Reservation
              </button>
              <button onClick={doCancel}
                className="flex-1 bg-destructive text-white rounded-lg py-2.5 text-sm font-medium">
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyReservations() {
  return (
    <LibraryProvider>
      <MyReservationsContent />
    </LibraryProvider>
  );
}
