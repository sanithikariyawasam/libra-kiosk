import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-external";
import { detectAndApplyRestrictions } from "@/lib/overdue";

export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'kiosk' | 'overdue';

export interface Book {
  id: string;
  title: string;
  author: string;
  rfid_tag: string;
  status: BookStatus;
  due_date: string | null;
}

export interface Member {
  id: string;
  uni_id: string;
  name: string;
  rfid_tag: string | null;
  borrowed: string[];
  status: 'active' | 'restricted';
  restriction_reason: string | null;
  restricted_at: string | null;
}

export interface Reservation {
  id: string;
  book_id: string;
  member_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'active' | 'collected' | 'cancelled' | 'expired';
  type: 'kiosk';
  compartment: string | null;
}

interface LibraryContextType {
  currentUser: Member | null;
  books: Book[];
  reserveSeconds: number;
  hasActiveReservation: boolean;
  reservedBookTitle: string;
  login: (uniId: string, password: string) => Promise<string | null>;
  logout: () => void;
  searchBooks: (query: string, type: "title" | "author") => Book[];
  getMyBooks: () => Book[];
  reserveBook: (bookId: string, compartment: string) => Promise<{ expiresAt: Date; reservationId: string } | null>;
  cancelReservation: (reservationId: string, bookId: string, compartment: string | null) => Promise<void>;
  hasExistingActiveReservation: () => Promise<boolean>;
  refreshMember: () => Promise<void>;
  startTimer: () => void;
  stopTimer: () => void;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [reserveSeconds, setReserveSeconds] = useState(3600);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [reservedBookTitle, setReservedBookTitle] = useState("");
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase.from("books").select("*");
      if (data) {
        setBooks(data.map((b: any) => ({
          id: b.id, title: b.title, author: b.author, rfid_tag: b.rfid_tag,
          status: b.status as BookStatus, due_date: b.due_date,
        })));
      }
    };
    fetchBooks();

    const channel = supabase
      .channel("books-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, (payload: any) => {
        if (payload.eventType === "UPDATE") {
          const updated = payload.new;
          setBooks(prev => prev.map(b => b.id === updated.id
            ? { ...b, status: updated.status as BookStatus, due_date: updated.due_date }
            : b));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const refreshMember = useCallback(async () => {
    if (!currentUser) return;
    await detectAndApplyRestrictions(currentUser.id);
    const { data: m } = await supabase.from("members").select("*").eq("id", currentUser.id).maybeSingle();
    const { data: borrowedData } = await supabase
      .from("borrowed_books").select("book_id").eq("member_id", currentUser.id).is("returned_at", null);
    if (m) {
      setCurrentUser({
        id: m.id, uni_id: m.uni_id, name: m.name, rfid_tag: m.rfid_tag ?? null,
        borrowed: borrowedData?.map((b: any) => b.book_id) ?? [],
        status: (m.status ?? 'active') as 'active' | 'restricted',
        restriction_reason: m.restriction_reason ?? null,
        restricted_at: m.restricted_at ?? null,
      });
    }
  }, [currentUser]);

  const login = useCallback(async (uniId: string, password: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: member } = await supabase
        .from("members").select("*").eq("uni_id", uniId).eq("password_hash", password).maybeSingle();
      if (!member) return "Invalid ID or password. Try again.";

      // Apply automatic restriction detection at login
      await detectAndApplyRestrictions(member.id);
      const { data: refreshed } = await supabase.from("members").select("*").eq("id", member.id).maybeSingle();
      const m = refreshed ?? member;

      const { data: borrowedData } = await supabase
        .from("borrowed_books").select("book_id").eq("member_id", m.id).is("returned_at", null);

      setCurrentUser({
        id: m.id, uni_id: m.uni_id, name: m.name, rfid_tag: m.rfid_tag ?? null,
        borrowed: borrowedData?.map((b: any) => b.book_id) ?? [],
        status: (m.status ?? 'active') as 'active' | 'restricted',
        restriction_reason: m.restriction_reason ?? null,
        restricted_at: m.restricted_at ?? null,
      });
      return null;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setHasActiveReservation(false);
    setReservedBookTitle("");
    if (timerInterval) clearInterval(timerInterval);
    setTimerInterval(null);
  }, [timerInterval]);

  const searchBooks = useCallback((query: string, type: "title" | "author"): Book[] => {
    const q = query.toLowerCase();
    return books.filter(b => type === "title" ? b.title.toLowerCase().includes(q) : b.author.toLowerCase().includes(q));
  }, [books]);

  const getMyBooks = useCallback((): Book[] => {
    if (!currentUser) return [];
    return books.filter(b => currentUser.borrowed.includes(b.id));
  }, [currentUser, books]);

  const ONE_HOUR_MS = 60 * 60 * 1000;

  const hasExistingActiveReservation = useCallback(async () => {
    if (!currentUser) return false;
    const { data } = await supabase
      .from("reservations")
      .select("id")
      .eq("member_id", currentUser.id)
      .eq("status", "active")
      .limit(1);
    return (data?.length ?? 0) > 0;
  }, [currentUser]);

  const reserveBook = useCallback(async (bookId: string, compartment: string) => {
    if (!currentUser) return null;
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS);

    await supabase.from("books").update({ status: "reserved" }).eq("id", bookId);

    const { data: insertData } = await supabase.from("reservations").insert({
      member_id: currentUser.id,
      book_id: bookId,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      type: 'kiosk',
      compartment,
    }).select("id").single();

    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: "reserved" as const } : b));

    const book = books.find(b => b.id === bookId);
    if (book) {
      setReservedBookTitle(book.title);
      setHasActiveReservation(true);
      setReserveSeconds(3600);
    }
    return { expiresAt, reservationId: insertData?.id ?? '' };
  }, [books, currentUser]);

  const cancelReservation = useCallback(async (reservationId: string, bookId: string, _compartment: string | null) => {
    const now = new Date().toISOString();
    await supabase.from("reservations").update({
      status: 'cancelled', cancelled_at: now, cancellation_reason: 'Member cancelled',
    }).eq("id", reservationId);
    // Kiosk reservations always release book back to kiosk
    await supabase.from("books").update({ status: "kiosk" }).eq("id", bookId);
    setHasActiveReservation(false);
  }, []);

  const startTimer = useCallback(() => {

    if (timerInterval) clearInterval(timerInterval);
    const interval = setInterval(() => {
      setReserveSeconds(prev => {
        if (prev <= 1) { clearInterval(interval); setHasActiveReservation(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  }, [timerInterval]);

  const stopTimer = useCallback(() => {
    if (timerInterval) clearInterval(timerInterval);
    setTimerInterval(null);
  }, [timerInterval]);

  return (
    <LibraryContext.Provider value={{
      currentUser, books, reserveSeconds, hasActiveReservation, reservedBookTitle,
      login, logout, searchBooks, getMyBooks, reserveBook, cancelReservation, refreshMember,
      startTimer, stopTimer, loading,
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
