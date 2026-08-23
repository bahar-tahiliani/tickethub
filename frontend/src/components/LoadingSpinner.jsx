export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <div className="w-8 h-8 border-2 border-marquee/30 border-t-marquee rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
