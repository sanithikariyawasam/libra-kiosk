import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-external";
import { useLibrary } from "@/context/LibraryContext";

export type ActiveRestriction = {
  reason: string;
  book_title: string | null;
  due_date: string | null;
};

export function useActiveRestriction(): ActiveRestriction | null {
  const { currentUser } = useLibrary();
  const [r, setR] = useState<ActiveRestriction | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentUser || currentUser.status !== "restricted") { setR(null); return; }
      const { data } = await supabase
        .from("restriction_history")
        .select("reason, book_title, due_date")
        .eq("member_id", currentUser.id)
        .eq("status", "active")
        .order("restricted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) setR(data as ActiveRestriction);
      else setR({ reason: currentUser.restriction_reason ?? "Account restricted", book_title: null, due_date: null });
    };
    run();
    return () => { cancelled = true; };
  }, [currentUser]);

  return r;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "Asia/Colombo", year: "numeric", month: "short", day: "numeric" });
}

export function buildRestrictionMessage(r: ActiveRestriction): { banner: string; popup: string } {
  const title = r.book_title ?? "a book";
  const due = formatDate(r.due_date);
  if (r.reason === "Book returned after due date") {
    return {
      banner: `🪙 You have an outstanding fine for "${title}". Please visit the library to pay and clear your restriction.`,
      popup: `Your account is restricted because "${title}" was returned late. Please visit the library to pay the outstanding fine to remove this restriction.`,
    };
  }
  // default = "Book not returned by due date"
  return {
    banner: `📚 "${title}" is overdue since ${due}. Please return it immediately.`,
    popup: `Your account is restricted because "${title}" has not been returned and was due on ${due}. Please return it to the library or kiosk to remove this restriction.`,
  };
}

export default function RestrictionBanner() {
  const r = useActiveRestriction();
  if (!r) return null;
  const { banner } = buildRestrictionMessage(r);
  return (
  <div className="border-2 border-orange-500 bg-orange-50 rounded-2xl p-8 mb-8 flex items-center gap-6">
    <div className="text-6xl">🚫</div>

    <div>
      <h2 className="text-3xl font-bold text-orange-700 mb-2">
        Account Restricted
      </h2>

      <p className="text-xl font-semibold text-orange-600">
        {banner}
      </p>
    </div>
  </div>
);
}
