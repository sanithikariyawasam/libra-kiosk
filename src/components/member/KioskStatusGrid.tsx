import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-external";
import { RefreshCw } from "lucide-react";

type Slot = {
  compartment: string;
  book_id: string | null;
  book_name: string | null;
};

interface Props {
  onReserve: (bookId: string, compartment: string) => void;
  refreshKey: number;
}

export default function KioskStatusGrid({ onReserve, refreshKey }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = async () => {
    setLoading(true);
    const { data } = await supabase.from("kiosk").select("compartment, book_id, book_name").order("compartment");
    setSlots((data as Slot[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, [refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("kiosk-member")
      .on("postgres_changes", { event: "*", schema: "public", table: "kiosk" }, () => fetchSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  
  const availableSlots = slots.filter(
      s => !(!!s.book_id && !!s.book_name)
      ).length;

  console.log("Slots:", slots);
  console.log("Available Slots:", availableSlots);
  
  return (
    <div className="mt-8">

      <div className="mb-4 border rounded-lg p-3 bg-muted/20">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground mb-1">
          Return Availability
        </div>

        {availableSlots > 0 ? (
          <div className="text-sm text-green-600 font-medium">
            🟢 Kiosk Available for returns ({availableSlots} slot{availableSlots > 1 ? "s" : ""} remaining)
          </div>
    ) : (
          <div className="text-sm text-red-600 font-medium">
            🔴 Kiosk Full — Please return books at the library counter.
          </div>
  )}
</div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] text-muted-foreground tracking-[2px] uppercase">
          Kiosk Status
        </div>
        <button onClick={fetchSlots}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {slots.map((s) => {
            const occupied = !!s.book_id && !!s.book_name;
            return (
              <div key={s.compartment}
                className={`border-2 rounded-[14px] p-4 ${occupied ? "border-accent bg-accent/5" : "border-border bg-muted/20 opacity-70"}`}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`font-serif text-2xl font-black ${occupied ? "text-accent" : "text-muted-foreground"}`}>{s.compartment}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Compartment</span>
                </div>
                {occupied ? (
                  <>
                    <div className="text-sm font-medium text-foreground truncate mb-3">{s.book_name}</div>
                    <button
                      onClick={() => onReserve(s.book_id!, s.compartment)}
                      className="w-full bg-blue-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-blue-700">
                      Reserve
                    </button>
                  </>
                ) : (
                  <div className="text-sm italic text-muted-foreground">Available slot</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
