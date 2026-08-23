export default function SeatLegend({ categories = [] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      <LegendItem colorClass="bg-mint" label="Available" />
      <LegendItem colorClass="bg-marquee" label="Held" />
      <LegendItem colorClass="bg-crimson" label="Booked" />
      <LegendItem colorClass="bg-white/10 border border-white/20" label="Not available" />
      {categories.map((c) => (
        <span key={c.category_id || c.id} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: c.color_code }} />
          {c.category_name || c.name}
        </span>
      ))}
    </div>
  );
}

function LegendItem({ colorClass, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${colorClass}`} />
      {label}
    </span>
  );
}
