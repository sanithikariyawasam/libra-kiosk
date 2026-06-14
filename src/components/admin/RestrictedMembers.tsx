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
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: "Asia/Colombo", year: "numeric", month: "short", day: "numeric",
  });
}

export default function RestrictedMembers() {
  const [rows, setRows] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("restriction_history")
      .select("id, member_id, uni_id, member_name, book_id, book_title, reason, due_date, return_date, days_overdue, status, restricted_at")
      .eq("status", "active")
      .order("restricted_at", { ascending: false });
    setRows((data as Restriction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const removeRestriction = async (r: Restriction) => {
    setRemovingId(r.id);
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmail = user?.email ?? "admin";
    const now = new Date().toISOString();

    await supabase.from("restriction_history").update({
      status: 'cleared', cleared_at: now, cleared_by_admin: adminEmail,
    }).eq("id", r.id);

    const { data: stillActive } = await supabase.from("restriction_history")
      .select("id").eq("member_id", r.member_id).eq("status", "active");
    if (!stillActive || stillActive.length === 0) {
      await supabase.from("members").update({
        status: 'active', restriction_reason: null, restricted_at: null,
      }).eq("id", r.member_id);
    }

    toast.success(`Restriction removed for ${r.member_name ?? 'member'}`);
    setRows(prev => prev.filter(x => x.id !== r.id));
    setRemovingId(null);
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.uni_id ?? '').toLowerCase().includes(q)
      || (r.member_name ?? '').toLowerCase().includes(q)
      || (r.book_title ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="px-10 py-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-[28px] font-black text-foreground tracking-tight">Restricted Members</h2>
        <button onClick={fetchAll}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-sans text-xs px-3.5 py-1.5 rounded-lg hover:border-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Active member restrictions. Clear one to release the member.</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Student ID, Name or Book Title..."
          className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
      </div>

      {loading ? <p className="text-center text-muted-foreground py-10">Loading...</p> :
        filtered.length === 0 ? <p className="text-center text-muted-foreground py-10">No active restrictions.</p> :
        <div className="bg-card border border-border rounded-[14px] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>Uni ID</TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead>Book Title</TableHead>
                <TableHead>Book ID</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.uni_id ?? '—'}</TableCell>
                  <TableCell className="font-medium">{r.member_name ?? '—'}</TableCell>
                  <TableCell className="font-serif">{r.book_title ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.book_id ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{formatDate(r.due_date)}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {r.return_date ? formatDate(r.return_date) : <span className="text-destructive">Not returned</span>}
                  </TableCell>
                  <TableCell className="font-bold">{r.days_overdue ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => removeRestriction(r)}
                      disabled={removingId === r.id}
                      className="bg-destructive text-white rounded-lg px-3 py-1.5 text-[11px] font-bold hover:opacity-90 disabled:opacity-50">
                      {removingId === r.id ? 'Removing…' : 'Remove Restriction'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    </div>
  );
}
