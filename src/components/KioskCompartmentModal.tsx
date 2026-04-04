import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-external";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type KioskSlot = {
  id: string;
  compartment: string;
  book_id: string | null;
  book_name: string | null;
  returned_at: string | null;
};

type SlotDetail = {
  compartment: string;
  book_id: string | null;
  book_name: string | null;
  returned_at: string | null;
  member_id: string | null;
  members: { name: string; uni_id: string } | null;
};

export default function KioskCompartmentModal({
  slot,
  open,
  onOpenChange,
}: {
  slot: KioskSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<SlotDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !slot?.book_id) {
      setDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("kiosk")
        .select(`
          compartment,
          book_id,
          book_name,
          returned_at,
          member_id,
          members!kiosk_member_id_fkey (
            name,
            uni_id
          )
        `)
        .eq("compartment", slot.compartment)
        .single();

      if (!error && data) {
        setDetail(data as unknown as SlotDetail);
      }
      setLoading(false);
    };

    fetchDetail();
  }, [open, slot?.compartment, slot?.book_id]);

  if (!slot) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const d = detail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-paper border-border rounded-[18px] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-black text-foreground tracking-tight">
            Compartment Details
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground italic py-4">Loading...</p>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-start gap-2.5">
              <span className="text-lg">📚</span>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Book Name</p>
                <p className="text-sm font-medium text-foreground">{d?.book_name || slot.book_name || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-lg">🔖</span>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Compartment</p>
                <p className="text-sm font-medium text-foreground">Compartment {(d?.compartment || slot.compartment).trim()}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-lg">🕐</span>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Returned At</p>
                <p className="text-sm font-medium text-foreground">{formatDate(d?.returned_at || slot.returned_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Member</p>
                {d?.members ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{d.members.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.members.uni_id}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Member info not available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
