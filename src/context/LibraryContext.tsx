import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { MEMBERS, BOOKS as INITIAL_BOOKS, type Book, type Member } from "@/data/library-data";

interface LibraryContextType {
  currentUser: Member | null;
  books: Book[];
  reserveSeconds: number;
  hasActiveReservation: boolean;
  reservedBookTitle: string;
  login: (id: string, password: string) => string | null;
  logout: () => void;
  searchBooks: (query: string, type: "title" | "author") => Book[];
  getMyBooks: () => Book[];
  reserveBook: (bookId: string) => void;
  startTimer: () => void;
  stopTimer: () => void;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [reserveSeconds, setReserveSeconds] = useState(3600);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [reservedBookTitle, setReservedBookTitle] = useState("");
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const login = useCallback((id: string, password: string): string | null => {
    const member = MEMBERS[id];
    if (!member || member.password !== password) return "Invalid ID or password. Try again.";
    setCurrentUser(member);
    return null;
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
    return books.filter(b =>
      type === "title" ? b.title.toLowerCase().includes(q) : b.author.toLowerCase().includes(q)
    );
  }, [books]);

  const getMyBooks = useCallback((): Book[] => {
    if (!currentUser) return [];
    return books.filter(b => currentUser.borrowed.includes(b.id));
  }, [currentUser, books]);

  const reserveBook = useCallback((bookId: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: "reserved" as const } : b));
    const book = books.find(b => b.id === bookId);
    if (book) {
      setReservedBookTitle(book.title);
      setHasActiveReservation(true);
      setReserveSeconds(3600);
    }
  }, [books]);

  const startTimer = useCallback(() => {
    if (timerInterval) clearInterval(timerInterval);
    const interval = setInterval(() => {
      setReserveSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setHasActiveReservation(false);
          return 0;
        }
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
      login, logout, searchBooks, getMyBooks, reserveBook, startTimer, stopTimer,
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
