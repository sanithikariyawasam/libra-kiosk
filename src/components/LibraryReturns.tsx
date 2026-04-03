import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type BorrowedRecord = {
  id: string;
  book_id: string;
  member_id: string;
  borrowed_at: string | null;
  book_title: string;
  member_name: string;
};

export default function LibraryReturns() {
  const [records, setRecords] = useState<BorrowedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    // Fetch unreturned borrowed books with member & book info
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

    // Fetch book titles and member names
    const bookIds = [...new Set(borrowed.map(b => b.book_id))];
    const memberIds = [...new Set(borrowed.map(b => b.member_id))];

    const [booksRes, membersRes] = await Promise.all([
      supabase.from("books").select("id, title").in("id", bookIds),
      supabase.from("members").select("id, name").in("id", memberIds),
    ]);

    const bookMap = new Map((booksRes.data || []).map(b => [b.id, b.title]));
    const memberMap = new Map((membersRes.data || []).map(m => [m.id, m.name]));

    setRecords(
      borrowed.map(b => ({
        id: b.id,
        book_id: b.book_id,
        member_id: b.member_id,
        borrowed_at: b.borrowed_at,
        book_title: bookMap.get(b.book_id) || "Unknown",
        member_name: memberMap.get(b.member_id) || "Unknown",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleReturn = async (record: BorrowedRecord) => {
    setReturning(record.id);
    const now = new Date().toISOString();

    const [borrowRes, bookRes] = await Promise.all([
      supabase.from("borrowed_books").update({ returned_at: now }).eq("id", record.id),
      supabase.from("books").update({ status: "available" }).eq("id", record.book_id),
    ]);

    if (borrowRes.error || bookRes.error) {
      toast.error("Failed to mark as returned");
    } else {
      toast.success(`"${record.book_title}" marked as returned`);
      await fetchRecords();
    }
    setReturning(null);
  };

  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h2 className="font-serif text-[28px] font-black text-ink tracking-tight mb-2 text-center">
        Library Returns
      </h2>
      <p className="text-sm text-muted-foreground font-light text-center mb-8">
        Books currently borrowed — mark as returned when handed back at the desk.
      </p>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-10">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <span className="text-4xl block mb-2 opacity-30">✅</span>
          <p className="text-sm font-light">No outstanding borrows.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[14px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-serif font-bold text-foreground">Member Name</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Book Title</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Borrowed Date</TableHead>
                <TableHead className="font-serif font-bold text-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.member_name}</TableCell>
                  <TableCell className="font-serif text-foreground">{r.book_title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {r.borrowed_at
                      ? new Date(r.borrowed_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleReturn(r)}
                      disabled={returning === r.id}
                      className="bg-accent text-accent-foreground rounded-lg px-4 py-1.5 text-[11px] font-medium cursor-pointer transition-all font-sans hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {returning === r.id ? "Returning..." : "Mark as Returned"}
                    </button>
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
