import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase-external";
import { useLibrary } from "@/context/LibraryContext";
import { toast } from "sonner";

type ActiveRow = {
  id: string;
  book_id: string;
  reserved_at: string;
  expires_at: string;
  compartment: string | null;
  book_title: string;
};


export default function ActiveReservation({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const { currentUser, cancelReservation } = useLibrary();
  const [row, setRow] = useState<ActiveRow | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchActive = async () => {
    if (!currentUser) return;
    const { data: res } = await supabase
      .from("reservations")
      .select("id, book_id, reserved_at, expires_at, compartment, status")
      .eq("member_id", currentUser.id)
      .eq("status", "active")
      .order("reserved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!res) { setRow(null); return; }
    const { data: b } = await supabase.from("books").select("title").eq("id", res.book_id).maybeSingle();
    setRow({
      id: res.id, book_id: res.book_id, reserved_at: res.reserved_at,
      expires_at: res.expires_at, compartment: res.compartment ?? null,
      book_title: b?.title ?? "—",
    });
  };

  useEffect(() => { fetchActive(); /* eslint-disable-next-line */ }, [currentUser, refreshKey]);

  // auto-expire
  useEffect(() => {
    const run = async () => {
      if (!row || expired) return;
      if (new Date(row.expires_at).getTime() > now) return;
      setExpired(true);
      await supabase.from("reservations").update({ status: "expired" }).eq("id", row.id);
      await supabase.from("books").update({ status: "kiosk" }).eq("id", row.book_id);
      toast.info(`⌛ Reservation for "${row.book_title}" expired.`);
      setRow(null);
      onChange();
    };
    run();
  }, [now, row, expired, onChange]);

  if (!row) return null;
  const remaining = new Date(row.expires_at).getTime() - now;

  const doCancel = async () => {
    await cancelReservation(row.id, row.book_id, row.compartment);
    toast.success("✅ Reservation cancelled");
    setConfirmOpen(false);
    setRow(null);
    onChange();
  };

  return (
    <div className="border-2 border-blue-500 bg-blue-50 rounded-[14px] p-5 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📦</span>
        <strong className="font-serif text-blue-800">ACTIVE RESERVATION</strong>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-blue-700 mb-1">Book</div>
          <div className="font-serif font-bold text-ink">{row.book_title}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-blue-700 mb-1">Compartment</div>
          <div className="font-serif text-2xl font-black text-blue-700">{row.compartment ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-blue-700 mb-1">Time Remaining</div>
          <div className="font-mono text-2xl font-bold text-blue-700">{fmt(remaining)}</div>
        </div>
      </div>
      <button onClick={() => setConfirmOpen(true)}
        className="bg-destructive text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90">
        Cancel Reservation
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5 backdrop-blur-[4px]">
          <div className="bg-paper border border-border rounded-[20px] p-8 max-w-md w-full">
            <h3 className="font-serif text-xl font-bold mb-2">Cancel Reservation?</h3>
            <p className="text-sm text-ink2 mb-6">Cancel reservation for <strong>{row.book_title}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-warm border border-border rounded-lg py-2.5 text-sm">Keep</button>
              <button onClick={doCancel}
                className="flex-1 bg-destructive text-white rounded-lg py-2.5 text-sm font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
