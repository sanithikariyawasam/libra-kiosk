interface Props {
  type: 'library' | 'kiosk';
  bookTitle: string;
  author: string;
  compartment?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ReserveModal({ type, bookTitle, author, compartment, onCancel, onConfirm }: Props) {
  const isKiosk = type === 'kiosk';
  return (
    <div className="fixed inset-0 bg-[hsl(24_27%_9%/0.5)] z-[200] flex items-center justify-center p-5 backdrop-blur-[4px]">
      <div className="animate-rise bg-paper border border-border rounded-[20px] p-9 max-w-[460px] w-full shadow-[0_20px_60px_hsl(24_27%_9%/0.2)]">
        <h2 className="font-serif text-[22px] font-bold mb-2">Confirm Reservation</h2>
        <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
          {isKiosk
            ? 'Please collect this book from the kiosk within 1 hour.'
            : 'Please collect this book from the main library within 2 weeks.'}
        </p>
        <div className="font-serif text-[17px] font-bold text-ink bg-warm border border-border rounded-[10px] px-4 py-3.5 mb-2">
          {bookTitle}
        </div>
        <div className="text-xs text-ink2 italic mb-4 px-1">by {author}</div>
        <div className="bg-warm border border-border rounded-[10px] px-4 py-3.5 mb-5 text-[13px] text-ink2 leading-[1.8] font-mono">
          📍 Pickup Location: {isKiosk ? `LibraKiosk${compartment ? ` · Compartment ${compartment}` : ''}` : 'Main Library'}<br />
          ⏱ Reservation Period: {isKiosk ? '1 Hour' : '2 Weeks'}<br />
          🪪 Bring your student ID card
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 bg-warm text-ink2 border border-border rounded-[10px] py-3 font-sans text-[13px] cursor-pointer transition-colors hover:bg-border">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-green-accent text-accent-foreground border-none rounded-[10px] py-3 font-sans text-[13px] font-medium cursor-pointer transition-colors hover:bg-[hsl(153_42%_25%)]">
            Confirm Reservation
          </button>
        </div>
      </div>
    </div>
  );
}
