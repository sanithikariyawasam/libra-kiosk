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

type MemberInfo = {
  name: string;
  id: string;
} | null;

export default function KioskCompartmentModal({
  slot,
  open,
  onOpenChange,
}: {
  slot: KioskSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [member, setMember] = useState<MemberInfo>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !slot?.book_id) {
      setMember(null);
      return;
    }

    const fetchMember = async () => {
      setLoading(true);
      // Find borrowed_books record matching this book_id
      const { data: borrowed } = await supabase
        .from("borrowed_books")
        .select("member_id")
        .eq("book_id", slot.book_id!)
        .order("borrowed_at", { ascending: false })
        .limit(1);

      if (borrowed && borrowed.length > 0) {
        const { data: memberData } = await supabase
          .from("members")
          .select("id, name")
          .eq("id", borrowed[0].member_id)
          .single();

        if (memberData) {
          setMember({ name: memberData.name, id: memberData.id });
        }
      }
      setLoading(false);
    };

    fetchMember();
  }, [open, slot?.book_id]);

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-paper border-border rounded-[18px] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-black text-foreground tracking-tight">
            Compartment Details
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">📚</span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Book Name</p>
              <p className="text-sm font-medium text-foreground">{slot.book_name || "Unknown"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🔖</span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Compartment</p>
              <p className="text-sm font-medium text-foreground">Compartment {slot.compartment}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🕐</span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Returned At</p>
              <p className="text-sm font-medium text-foreground">
                {slot.returned_at
                  ? new Date(slot.returned_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-lg">👤</span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Member</p>
              {loading ? (
                <p className="text-sm text-muted-foreground italic">Loading...</p>
              ) : member ? (
                <>
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{member.id}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Member info not available</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
