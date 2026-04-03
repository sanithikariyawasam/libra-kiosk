import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="text-center max-w-lg w-full animate-rise">
        {/* Logo & Title */}
        <span className="text-6xl block mb-4">📚</span>
        <h1 className="font-serif text-[48px] font-black text-ink tracking-tight mb-2">
          LibraKiosk
        </h1>
        <p className="text-muted-foreground text-sm font-light mb-12">
          Welcome to LibraKiosk — your smart library companion.
        </p>

        {/* Role Selection Cards */}
        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <Link
            to="/member"
            className="flex-1 bg-paper border-2 border-border rounded-[20px] p-8 transition-all hover:border-accent-orange hover:shadow-[0_8px_30px_hsl(var(--shadow-color)/0.12)] group no-underline"
          >
            <span className="text-4xl block mb-3">🧑‍💼</span>
            <h2 className="font-serif text-xl font-bold text-ink mb-1.5 group-hover:text-[hsl(var(--accent-orange))]">
              Member Login
            </h2>
            <p className="text-xs text-muted-foreground font-light">
              Browse books, reserve & manage your account
            </p>
          </Link>

          <Link
            to="/admin"
            className="flex-1 bg-paper border-2 border-border rounded-[20px] p-8 transition-all hover:border-ink hover:shadow-[0_8px_30px_hsl(var(--shadow-color)/0.12)] group no-underline"
          >
            <span className="text-4xl block mb-3">🔐</span>
            <h2 className="font-serif text-xl font-bold text-ink mb-1.5 group-hover:text-ink2">
              Admin Login
            </h2>
            <p className="text-xs text-muted-foreground font-light">
              Manage kiosk compartments & library returns
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
