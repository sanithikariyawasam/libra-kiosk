import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type CombinedRecord = {
  id: string;
  borrowed_at: string | null;
  due_date: string | null;
  book_id: string;
  member_id: string;
  book_title: string;
  member_name: string;
  member_uni_id: string;
};

export default function CurrentlyBorrowedBooks() {
  const [records, setRecords] = useState<CombinedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);

    // Step 1
    const { data: borrowedData, error } = await supabase
      .from("borrowed_books")
      .select("id, member_id, book_id, borrowed_at, due_date")
      .is("returned_at", null)
      .order("due_date", { ascending: true });

    console.log("borrowedData:", borrowedData, "error:", error);

    if (error || !borrowedData) {
      toast.error("Failed to fetch borrowed books");
      setLoading(false);
      return;
    }

    // Steps 2 & 3 — fetch book and member for each record
    const combined: CombinedRecord[] = await Promise.all(
      borrowedData.map(async (record: any) => {
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
          book_id: record.book_id,
          member_id: record.member_id,
          book_title,
          member_name,
          member_uni_id,
        };
      })
    );

    // Step 4 — sort
    const sorted = combined.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      const aOverdue = new Date(a.due_date) < new Date();
      const bOverdue = new Date(b.due_date) < new Date();
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    setRecords(sorted);
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
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-serif text-foreground">{r.book_title}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.member_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">{r.member_uni_id}</TableCell>
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
