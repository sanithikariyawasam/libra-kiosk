import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type TransactionRecord = {
  id: string;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  book_id: string;
  member_id: string;
  book_title: string;
  member_name: string;
  member_uni_id: string;
};

export default function TransactionHistory() {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchRecords = async () => {
    setLoading(true);

    const { data: allData, error } = await supabase
      .from("borrowed_books")
      .select("*")
      .order("borrowed_at", { ascending: false });

    console.log("allData:", allData);
    console.log("error:", error);

    if (error || !allData) {
      toast.error("Failed to fetch transaction history");
      setLoading(false);
      return;
    }

    const combined: TransactionRecord[] = await Promise.all(
      allData.map(async (record: any) => {
        let book_title = "N/A";
        let member_name = "N/A";
        let member_uni_id = "N/A";

        try {
          const { data: bookData } = await supabase
            .from("books")
            .select("id, title")
            .eq("id", record.book_id)
            .single();
          if (bookData) book_title = bookData.title;
        } catch {}

        try {
          const { data: memberData } = await supabase
            .from("members")
            .select("id, name, uni_id")
            .eq("id", record.member_id)
            .single();
          if (memberData) {
            member_name = memberData.name;
            member_uni_id = memberData.uni_id;
          }
        } catch {}

        return {
          id: record.id,
          borrowed_at: record.borrowed_at,
          due_date: record.due_date,
          returned_at: record.returned_at,
          book_id: record.book_id,
          member_id: record.member_id,
          book_title,
          member_name,
          member_uni_id,
        };
      })
    );

    setRecords(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatus = (r: TransactionRecord) => {
    if (r.returned_at) return "returned";
    if (r.due_date && new Date() > new Date(r.due_date)) return "overdue";
    return "on_time";
  };

  const filtered = records.filter(
    (r) =>
      r.book_title.toLowerCase().includes(search.toLowerCase()) ||
      r.member_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-[28px] font-black text-foreground tracking-tight">
          Full Transaction History
        </h2>
        <button
          onClick={fetchRecords}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-sans text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:border-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted-foreground font-light mb-4">
        Complete log of all borrow and return transactions.
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by book title or member name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary placeholder:text-muted-foreground/50"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-10">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <span className="text-4xl block mb-2 opacity-30">📋</span>
          <p className="text-sm font-light">No transactions found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[14px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-serif font-bold text-foreground">📚 Book Title</TableHead>
                <TableHead className="font-serif font-bold text-foreground">👤 Member Name</TableHead>
                <TableHead className="font-serif font-bold text-foreground">🆔 Member ID</TableHead>
                <TableHead className="font-serif font-bold text-foreground">📅 Borrowed</TableHead>
                <TableHead className="font-serif font-bold text-foreground">⏰ Due Date</TableHead>
                <TableHead className="font-serif font-bold text-foreground">🔄 Returned</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const status = getStatus(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-serif text-foreground">{r.book_title}</TableCell>
                    <TableCell className="font-medium text-foreground">{r.member_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">{r.member_uni_id}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{formatDate(r.borrowed_at)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{formatDate(r.due_date)}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {r.returned_at ? (
                        <span className="text-muted-foreground">{formatDate(r.returned_at)}</span>
                      ) : (
                        <span className="text-destructive font-semibold">Not Returned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {status === "returned" ? (
                        <span className="bg-accent/10 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          🟢 Returned
                        </span>
                      ) : status === "overdue" ? (
                        <span className="bg-destructive/10 text-destructive text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          🔴 Overdue
                        </span>
                      ) : (
                        <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          🔵 On Time
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
