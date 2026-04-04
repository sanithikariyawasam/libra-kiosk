import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type BorrowedRecord = {
  id: string;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  book_id: string;
  member_id: string;
  books: { title: string } | null;
  members: { name: string; uni_id: string } | null;
};

export default function CurrentlyBorrowedBooks() {
  const [records, setRecords] = useState<BorrowedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("borrowed_books")
      .select(`
        id,
        borrowed_at,
        due_date,
        returned_at,
        book_id,
        member_id,
        books!borrowed_books_book_id_fkey (
          title
        ),
        members!borrowed_books_member_id_fkey (
          name,
          uni_id
        )
      `)
      .is("returned_at", null)
      .order("due_date", { ascending: true });

    if (error) {
      toast.error("Failed to fetch borrowed books");
      setLoading(false);
      return;
    }

    setRecords((data as unknown as BorrowedRecord[]) || []);
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

  const isOverdue = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    return new Date() > new Date(dueDateStr);
  };

  // Sort: overdue first (most urgent), on-time next, no due date last
  const sorted = [...records].sort((a, b) => {
    const aOverdue = isOverdue(a.due_date);
    const bOverdue = isOverdue(b.due_date);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

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
      ) : sorted.length === 0 ? (
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
              {sorted.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-serif text-foreground">{r.books?.title || "Unknown"}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.members?.name || "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">{r.members?.uni_id || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{formatDate(r.borrowed_at)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{formatDate(r.due_date)}</TableCell>
                  <TableCell>
                    {isOverdue(r.due_date) ? (
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
