import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type BorrowedRecord = {
  id: string;
  book_id: string;
  member_id: string;
  borrowed_at: string | null;
  book_title: string;
  member_name: string;
  due_date: Date | null;
  overdue: boolean;
};

export default function CurrentlyBorrowedBooks() {
  const [records, setRecords] = useState<BorrowedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    const { data: borrowed, error } = await supabase
      .from("borrowed_books")
      .select("*")
      .is("returned_at", null);

    if (error) {
      toast.error("Failed to fetch borrowed books");
      setLoading(false);
      return;
    }

    if (!borrowed || borrowed.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const bookIds = [...new Set(borrowed.map(b => b.book_id))];
    const memberIds = [...new Set(borrowed.map(b => b.member_id))];

    const [booksRes, membersRes] = await Promise.all([
      supabase.from("books").select("id, title").in("id", bookIds),
      supabase.from("members").select("id, name").in("id", memberIds),
    ]);

    const bookMap = new Map((booksRes.data || []).map(b => [b.id, b.title]));
    const memberMap = new Map((membersRes.data || []).map(m => [m.id, m.name]));
    const now = new Date();

    const mapped = borrowed.map(b => {
      const dueDate = b.borrowed_at ? new Date(new Date(b.borrowed_at).getTime() + 14 * 24 * 60 * 60 * 1000) : null;
      return {
        id: b.id,
        book_id: b.book_id,
        member_id: b.member_id,
        borrowed_at: b.borrowed_at,
        book_title: bookMap.get(b.book_id) || "Unknown",
        member_name: memberMap.get(b.member_id) || "Unknown",
        due_date: dueDate,
        overdue: dueDate ? now > dueDate : false,
      };
    });

    mapped.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.getTime() - b.due_date.getTime();
    });

    setRecords(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-[28px] font-black text-foreground tracking-tight">
          Currently Borrowed Books
        </h2>
        <button
          onClick={fetchRecords}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-sans text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:border-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted-foreground font-light mb-8">
        All books currently checked out — sorted by due date (most urgent first).
      </p>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-10">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <span className="text-4xl block mb-2 opacity-30">✅</span>
          <p className="text-sm font-light">No books currently borrowed.</p>
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
                <TableHead className="font-serif font-bold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-serif text-foreground">{r.book_title}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.member_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">{r.member_id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {r.borrowed_at
                      ? new Date(r.borrowed_at).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {r.due_date
                      ? r.due_date.toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.overdue ? (
                      <span className="bg-destructive/10 text-destructive text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        🔴 Overdue
                      </span>
                    ) : (
                      <span className="bg-accent/10 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        🟢 On Time
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
