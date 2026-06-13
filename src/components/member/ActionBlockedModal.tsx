interface Props {
  open: boolean;
  onClose: () => void;
  reason?: string | null;
}

export default function ActionBlockedModal({ open, onClose, reason }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5 backdrop-blur-[4px]">
      <div className="bg-paper border-2 border-destructive rounded-[20px] p-9 max-w-[440px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.2)] animate-rise">
        <div className="text-center mb-4">
          <span className="text-5xl">🚫</span>
        </div>
        <h2 className="font-serif text-[22px] font-bold mb-3 text-center text-destructive">
          ACTION FAILED
        </h2>
        <p className="text-sm text-ink2 text-center mb-2 leading-relaxed">
          Your account is currently restricted{reason ? ` (${reason})` : ''}.
        </p>
        <p className="text-sm text-ink2 text-center mb-6 leading-relaxed">
          Please contact the librarian to resolve this issue.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-ink text-cream rounded-[10px] py-3 font-sans text-[13px] font-medium hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
