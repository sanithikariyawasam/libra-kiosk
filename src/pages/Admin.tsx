import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw, LogOut } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import KioskCompartmentModal from "@/components/KioskCompartmentModal";
import CurrentlyBorrowedBooks from "@/components/CurrentlyBorrowedBooks";
import TransactionHistory from "@/components/admin/TransactionHistory";

type KioskSlot = {
  id: string;
  compartment: string;
  book_id: string | null;
  book_name: string | null;
  returned_at: string | null;
};

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Invalid credentials. Please try again.");
    } else {
      onLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="animate-rise bg-card border border-border rounded-[20px] p-12 w-full max-w-[420px] shadow-[0_8px_40px_hsl(var(--shadow-color)/0.08)]">
        <div className="text-center mb-9">
          <span className="text-[40px] block mb-2.5">🔐</span>
          <h1 className="font-serif text-[28px] font-black text-foreground tracking-tight">Admin Login</h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-light">LibraKiosk · Admin Portal</p>
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground tracking-[1.5px] uppercase">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com"
              className="bg-secondary border-[1.5px] border-border rounded-[10px] px-4 py-3 font-sans text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-card placeholder:text-muted-foreground/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground tracking-[1.5px] uppercase">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="••••••••"
              className="bg-secondary border-[1.5px] border-border rounded-[10px] px-4 py-3 font-sans text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-card placeholder:text-muted-foreground/50" />
          </div>
        </div>
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-foreground text-background border-none rounded-[10px] py-3.5 font-sans text-sm font-medium cursor-pointer transition-all tracking-[0.5px] hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
          {loading ? "Signing in..." : "Login"}
        </button>
        {error && <p className="text-destructive text-xs text-center mt-3 font-mono">{error}</p>}
      </div>
    </div>
  );
}

function KioskStatus() {
  const [slots, setSlots] = useState<KioskSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<KioskSlot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("kiosk").select("*").order("compartment");
    if (error) toast.error("Failed to fetch kiosk data");
    else setSlots(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleSlotClick = (slot: KioskSlot) => {
    if (!slot.book_name) return;
    setSelectedSlot(slot);
    setModalOpen(true);
  };

  const positions = [
    { top: "5%", left: "50%", transform: "translate(-50%, 0)" },
    { top: "25%", left: "85%", transform: "translate(-50%, 0)" },
    { top: "65%", left: "85%", transform: "translate(-50%, 0)" },
    { top: "85%", left: "50%", transform: "translate(-50%, 0)" },
    { top: "65%", left: "15%", transform: "translate(-50%, 0)" },
    { top: "25%", left: "15%", transform: "translate(-50%, 0)" },
  ];

  return (
    <div className="px-10 py-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-[28px] font-black text-foreground tracking-tight">
          Kiosk Compartment Status
        </h2>
        <button onClick={fetchSlots}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-sans text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:border-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <p className="text-sm text-muted-foreground font-light text-center mb-12">
        Live view of all 6 kiosk compartments · Click an occupied slot for details
      </p>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-20">Loading...</div>
      ) : (
        <div className="relative w-full max-w-[500px] mx-auto" style={{ aspectRatio: "1" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-[32px]">📦</span>
            <p className="text-xs text-muted-foreground font-mono mt-1">KIOSK</p>
          </div>
          {slots.map((slot, i) => {
            const occupied = !!slot.book_name;
            const pos = positions[i] || positions[0];
            return (
              <div key={slot.id} onClick={() => handleSlotClick(slot)}
                className={`absolute w-[140px] rounded-2xl border-2 p-4 text-center transition-all shadow-md ${
                  occupied ? "bg-accent/10 border-accent cursor-pointer hover:shadow-lg hover:scale-105" : "bg-muted/30 border-border opacity-60"
                }`} style={pos}>
                <div className={`text-2xl font-serif font-black mb-1 ${occupied ? "text-accent" : "text-muted-foreground"}`}>
                  {slot.compartment}
                </div>
                <div className={`text-xs font-medium truncate ${occupied ? "text-foreground" : "text-muted-foreground italic"}`}>
                  {slot.book_name || "Empty"}
                </div>
                {slot.returned_at && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-1.5">
                    {new Date(slot.returned_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <KioskCompartmentModal slot={selectedSlot} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function KioskDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-card">
      <header className="bg-foreground text-background px-10 flex items-center justify-between h-16 sticky top-0 z-[100]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📚</span>
          <h2 className="font-serif text-lg font-bold tracking-tight">
            LibraKiosk <span className="text-[10px] opacity-40 font-mono ml-1">Admin</span>
          </h2>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 bg-transparent border border-background/20 text-background/60 font-sans text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:border-background/40 hover:text-background">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      <div className="px-10 pt-8">
        <Tabs defaultValue="kiosk" className="w-full max-w-5xl mx-auto">
          <TabsList className="w-full justify-start gap-1 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="kiosk" className="text-sm font-medium px-5 py-2 rounded-lg">🏠 Kiosk Status</TabsTrigger>
            <TabsTrigger value="borrowed" className="text-sm font-medium px-5 py-2 rounded-lg">📚 Currently Borrowed</TabsTrigger>
            <TabsTrigger value="history" className="text-sm font-medium px-5 py-2 rounded-lg">📋 Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="kiosk">
            <KioskStatus />
          </TabsContent>
          <TabsContent value="borrowed">
            <CurrentlyBorrowedBooks />
          </TabsContent>
          <TabsContent value="history">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setAuthed(!!session));
    return () => subscription.unsubscribe();
  }, []);

  if (authed === null) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return <KioskDashboard onLogout={async () => { await supabase.auth.signOut(); setAuthed(false); }} />;
}
