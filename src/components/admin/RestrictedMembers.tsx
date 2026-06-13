import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type Restriction = {
  id: string;
  member_id: string;
  uni_id: string | null;
  member_name: string | null;
  book_id: string | null;
  book_title: string | null;
  reason: string;
  due_date: string | null;
  return_date: string | null;
  days_overdue: number | null;
  status: 'active' | 'cleared';
  restricted_at: string;
  cleared_at: string | null;
  cleared_by_admin: string | null;
};

function formatTZ(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    timeZone: "Asia/Colombo", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function RestrictedMembers() {
  const [rows, setRows] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'cleared'>('active');
  const [sortBy, setSortBy] = useState<'days_overdue' | 'restricted_at'>('restricted_at');
  const [selected, setSelected] = useState<Restriction | null>(null);
  const [stats, setStats] = useState({ activeRestricted: 0, dueSoon: 0, overdue: 0, clearedThisMonth: 0 });

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from("restriction_history").select("*").order("restricted_at", { ascending: false });
    setRows((data as Restriction[]) ?? []);

    // stats
    const { data: members } = await supabase.from("members").select("id, status");
    const activeRestricted = (members ?? []).filter((m: any) => m.status === 'restricted').length;

    const { data: borrowed } = await supabase.from("borrowed_books").select("due_date, returned_at").is("returned_at", null);
    const nowMs = Date.now();
    const dueSoon = (borrowed ?? []).filter((b: any) => {
      if (!b.due_date) return false;
      const d = new Date(b.due_date).getTime();
      const diff = Math.ceil((d - nowMs) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).length;
    const overdueCount = (borrowed ?? []).filter((b: any) => b.due_date && new Date(b.due_date).getTime() < nowMs).length;

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const clearedThisMonth = ((data as Restriction[]) ?? []).filter(r => r.status === 'cleared' && r.cleared_at && new Date(r.cleared_at) >= monthStart).length;

    setStats({ activeRestricted, dueSoon, overdue: overdueCount, clearedThisMonth });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const removeRestriction = async (r: Restriction) => {
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmail = user?.email ?? "admin";
    const now = new Date().toISOString();

    // Clear history row
    await supabase.from("restriction_history").update({
      status: 'cleared', cleared_at: now, cleared_by_admin: adminEmail,
    }).eq("id", r.id);

    // If member has no other active restrictions, set active
    const { data: stillActive } = await supabase.from("restriction_history")
      .select("id").eq("member_id", r.member_id).eq("status", "active");
    if (!stillActive || stillActive.length === 0) {
      await supabase.from("members").update({
        status: 'active', restriction_reason: null, restricted_at: null,
      }).eq("id", r.member_id);
    }

    toast.success(`Restriction removed for ${r.member_name ?? 'member'}`);
    setSelected(null);
    fetchAll();
  };

  const filtered = rows
    .filter(r => filter === 'all' ? true : r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (r.uni_id ?? '').toLowerCase().includes(q) || (r.member_name ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'days_overdue') return (b.days_overdue ?? 0) - (a.days_overdue ?? 0);
      return new Date(b.restricted_at).getTime() - new Date(a.restricted_at).getTime();
    });

  return (
    <div className="px-10 py-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-[28px] font-black text-foreground tracking-tight">Restricted Members</h2>
        <button onClick={fetchAll}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-sans text-xs px-3.5 py-1.5 rounded-lg hover:border-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Manage member restrictions due to overdue books.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Restricted" value={stats.activeRestricted} color="bg-destructive/10 text-destructive border-destructive/30" />
        <StatCard label="Due Soon" value={stats.dueSoon} color="bg-yellow-50 text-yellow-700 border-yellow-300" />
        <StatCard label="Overdue Books" value={stats.overdue} color="bg-orange-50 text-orange-700 border-orange-300" />
        <StatCard label="Cleared This Month" value={stats.clearedThisMonth} color="bg-green-50 text-green-700 border-green-300" />
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Student ID or Name..."
            className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm">
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
          <option value="all">All</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm">
          <option value="restricted_at">Sort: Restriction Date</option>
          <option value="days_overdue">Sort: Days Overdue</option>
        </select>
      </div>

      {loading ? <p className="text-center text-muted-foreground py-10">Loading...</p> :
        filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">No restrictions match the filter.</p> :
        <div className="bg-card border border-border rounded-[14px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Book Title</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} onClick={() => setSelected(r)} className="cursor-pointer hover:bg-secondary/40">
                  <TableCell className="font-mono text-xs">{r.uni_id ?? '—'}</TableCell>
                  <TableCell className="font-medium">{r.member_name ?? '—'}</TableCell>
                  <TableCell className="font-serif">{r.book_title ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.reason}</TableCell>
                  <TableCell className="text-xs font-mono">{formatTZ(r.due_date)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.return_date ? formatTZ(r.return_date) : <span className="text-destructive">Not Returned</span>}</TableCell>
                  <TableCell>{r.days_overdue ?? '—'}</TableCell>
                  <TableCell>
                    {r.status === 'active'
                      ? <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-1 rounded-full">ACTIVE</span>
                      : <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">CLEARED</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5 backdrop-blur-[4px]"
          onClick={() => setSelected(null)}>
          <div className="bg-paper border border-border rounded-[20px] p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-2xl font-bold mb-4">Restriction Details</h3>
            <div className="space-y-3 text-sm mb-6">
              <DetailRow label="Student ID" value={selected.uni_id ?? '—'} />
              <DetailRow label="Student Name" value={selected.member_name ?? '—'} />
              <DetailRow label="Book ID" value={selected.book_id ?? '—'} />
              <DetailRow label="Book Title" value={selected.book_title ?? '—'} />
              <DetailRow label="Due Date" value={formatTZ(selected.due_date)} />
              <DetailRow label="Return Date" value={selected.return_date ? formatTZ(selected.return_date) : 'Not Returned'} />
              <DetailRow label="Days Overdue" value={String(selected.days_overdue ?? '—')} />
              <DetailRow label="Reason" value={selected.reason} />
              <DetailRow label="Restricted At" value={formatTZ(selected.restricted_at)} />
              <DetailRow label="Cleared At" value={selected.cleared_at ? formatTZ(selected.cleared_at) : '—'} />
              <DetailRow label="Cleared By" value={selected.cleared_by_admin ?? '—'} />
              <DetailRow label="Status" value={selected.status.toUpperCase()} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)}
                className="flex-1 bg-warm border border-border rounded-lg py-2.5 text-sm">Close</button>
              {selected.status === 'active' && (
                <button onClick={() => removeRestriction(selected)}
                  className="flex-1 bg-destructive text-white rounded-lg py-2.5 text-sm font-bold">
                  REMOVE RESTRICTION
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border rounded-[12px] p-4 ${color}`}>
      <div className="text-[10px] uppercase tracking-wider font-mono mb-1">{label}</div>
      <div className="text-3xl font-serif font-black">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}
