import { useEffect, useState, useCallback } from "react";
import { useLibrary } from "@/context/LibraryContext";
import BookCard from "@/components/BookCard";
import ReserveModal from "@/components/ReserveModal";
import MemberNotifications from "@/components/member/Notifications";
import ActionBlockedModal from "@/components/member/ActionBlockedModal";
import ActiveReservation from "@/components/member/ActiveReservation";
import KioskStatusGrid from "@/components/member/KioskStatusGrid";
import { useActiveRestriction, buildRestrictionMessage } from "@/components/member/RestrictionBanner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-external";

export default function MainApp() {
  const {
    currentUser, books, logout, searchBooks, getMyBooks,
    reserveBook, startTimer, refreshMember, hasExistingActiveReservation,
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "author">("title");
  const [searchResults, setSearchResults] = useState<typeof books | null>(null);
  const [modalBookId, setModalBookId] = useState<string | null>(null);
  const [modalCompartment, setModalCompartment] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ open: boolean; customMessage?: string }>({ open: false });
  const [refreshKey, setRefreshKey] = useState(0);

  const activeRestriction = useActiveRestriction();

  useEffect(() => {
    refreshMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearchResults(searchBooks(searchQuery.trim(), searchType));
  };

  const triggerReserve = useCallback(async (bookId: string, compartmentHint?: string) => {
    if (!currentUser) return;
    if (currentUser.status === "restricted") {
      setBlocked({ open: true });
      return;
    }
    const existing = await hasExistingActiveReservation();
    if (existing) {
      setBlocked({
        open: true,
        customMessage: "You already have an active reservation. Please cancel it before reserving another book.",
      });
      return;
    }

    let compartment = compartmentHint ?? null;
    if (!compartment) {
      const { data } = await supabase.from("kiosk").select("compartment").eq("book_id", bookId).maybeSingle();
      compartment = data?.compartment ?? null;
    }
    if (!compartment) {
      toast.error("This book is not currently in the kiosk and cannot be reserved.");
      return;
    }
    setModalCompartment(compartment);
    setModalBookId(bookId);
  }, [currentUser, hasExistingActiveReservation]);

  const confirmReserve = async () => {
    if (!modalBookId || !modalCompartment) return;
    const book = books.find(b => b.id === modalBookId);
    if (!book) return;

    await reserveBook(modalBookId, modalCompartment);
    startTimer();
    setModalBookId(null);
    setSearchQuery("");
    setSearchResults(null);
    setRefreshKey(k => k + 1);

    toast.success(`✅ Reserved! Collect from LibraKiosk · Compartment ${modalCompartment} within 1 hour.`);
  };

  const modalBook = modalBookId ? books.find(b => b.id === modalBookId) : null;
  const myBooks = getMyBooks();

  return (
    <div className="min-h-screen bg-paper relative z-[1]">
      <header className="bg-ink text-cream px-10 flex items-center justify-between h-16 sticky top-0 z-[100]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📚</span>
          <h2 className="font-serif text-lg font-bold tracking-tight">
            LibraKiosk <span className="text-[10px] text-[hsl(37_33%_92%/0.4)] font-mono ml-1">UOM</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[hsl(0_0%_100%/0.08)] border border-[hsl(0_0%_100%/0.12)] rounded-lg px-3.5 py-1.5 text-xs font-mono text-cream">
            {currentUser?.uni_id}
            {currentUser?.status === "restricted" && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-destructive text-white text-[9px] font-bold">RESTRICTED</span>
            )}
          </div>
          <button onClick={logout}
            className="bg-transparent border border-[hsl(0_0%_100%/0.2)] text-[hsl(37_33%_92%/0.6)] font-sans text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:border-[hsl(0_0%_100%/0.4)] hover:text-cream">
            Sign out
          </button>
        </div>
      </header>

      <div className="bg-cream border-b border-border py-12 px-10 text-center">
        <h1 className="font-serif text-[42px] font-black text-ink tracking-tight mb-2">
          Find your next <em className="italic text-accent-orange">read.</em>
        </h1>
        <p className="text-sm text-muted-foreground font-light mb-7">
          Search from our collection — reserve online, pick up at the kiosk.
        </p>
        <div className="flex max-w-[580px] mx-auto bg-paper border-[1.5px] border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_hsl(var(--shadow-color)/0.08)] transition-colors focus-within:border-accent-orange">
          <select value={searchType} onChange={e => setSearchType(e.target.value as "title" | "author")}
            className="bg-warm border-none border-r-[1.5px] border-r-border px-4 font-sans text-[13px] text-ink2 outline-none cursor-pointer min-w-[100px]">
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search books..."
            className="flex-1 border-none bg-transparent px-5 py-4 font-sans text-sm text-ink outline-none placeholder:text-border" />
          <button onClick={handleSearch}
            className="bg-accent-orange border-none text-primary-foreground px-6 font-sans text-[13px] font-medium cursor-pointer transition-colors tracking-[0.3px] hover:bg-[hsl(15_67%_40%)]">
            Search
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-10 py-9">
        <MemberNotifications />

        <ActiveReservation refreshKey={refreshKey} onChange={() => setRefreshKey(k => k + 1)} />

        {searchResults !== null ? (
          <div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-[2px] uppercase mb-4">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </div>
            <div className="flex flex-col gap-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="text-5xl mb-3 opacity-30">🔍</div>
                  <p className="text-sm font-light">No books found.</p>
                </div>
              ) : (
                searchResults.map(b => <BookCard key={b.id} book={b} onReserve={(id) => triggerReserve(id)} />)
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-[2px] uppercase mb-4">
              My Borrowed Books
            </div>
            <div className="flex flex-col gap-3">
              {myBooks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="text-5xl mb-3 opacity-30">📚</div>
                  <p className="text-sm font-light">You have no borrowed books right now.</p>
                </div>
              ) : (
                myBooks.map(b => <BookCard key={b.id} book={b} onReserve={(id) => triggerReserve(id)} />)
              )}
            </div>
          </div>
        )}

        <KioskStatusGrid refreshKey={refreshKey} onReserve={(bookId, comp) => triggerReserve(bookId, comp)} />

        <div className="mt-10">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[2px] uppercase mb-4">
            Full Library Catalog
          </div>
          <div className="bg-card border border-border rounded-[14px] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="font-serif font-bold text-foreground">#</TableHead>
                  <TableHead className="font-serif font-bold text-foreground">Title</TableHead>
                  <TableHead className="font-serif font-bold text-foreground">Author</TableHead>
                  <TableHead className="font-serif font-bold text-foreground text-center">Status</TableHead>
                  <TableHead className="font-serif font-bold text-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book, i) => {
                  const statusColors: Record<string, string> = {
                    available: "text-accent bg-accent/10",
                    kiosk: "text-blue-600 bg-blue-50",
                    reserved: "text-purple-600 bg-purple-50",
                    borrowed: "text-primary bg-primary/10",
                    overdue: "text-destructive bg-destructive/10",
                  };
                  const isMine = currentUser?.borrowed?.includes(book.id);
                  const canReserve = book.status === "kiosk" && !isMine;

                  return (
                    <TableRow key={book.id} className="hover:bg-secondary/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-serif font-semibold text-foreground">{book.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{book.author}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono text-[10px] px-2.5 py-1 rounded-full font-medium tracking-[0.5px] ${statusColors[book.status] ?? ""}`}>
                          {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isMine ? (
                          <span className="text-[11px] text-muted-foreground font-mono">Your Book</span>
                        ) : canReserve ? (
                          <button onClick={() => triggerReserve(book.id)}
                            className="rounded-lg px-4 py-1.5 text-[11px] font-medium cursor-pointer transition-all font-sans whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700">
                            Reserve
                          </button>
                        ) : (
                          <button disabled className="bg-border text-muted-foreground rounded-lg px-4 py-1.5 text-[11px] font-medium cursor-not-allowed font-sans">
                            Unavailable
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {modalBook && (
        <ReserveModal
          bookTitle={modalBook.title}
          author={modalBook.author}
          compartment={modalCompartment}
          onCancel={() => setModalBookId(null)}
          onConfirm={confirmReserve}
        />
      )}

      <ActionBlockedModal
        open={blocked.open}
        onClose={() => setBlocked({ open: false })}
        restriction={activeRestriction}
        customMessage={blocked.customMessage}
      />
    </div>
  );
}
