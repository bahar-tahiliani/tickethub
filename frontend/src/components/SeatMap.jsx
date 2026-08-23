const STATUS_CLASSES = {
  available:
    'bg-mint/20 border-mint text-mint hover:bg-mint hover:text-ink cursor-pointer',

  held:
    'bg-marquee/20 border-marquee text-marquee cursor-not-allowed opacity-70',

  booked:
    'bg-crimson/20 border-crimson text-crimson cursor-not-allowed opacity-70',

  unavailable:
    'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
};

export default function SeatMap({
  seats,
  selectedSeats,
  selectedCategoryId,
  onToggleSeat
}) {
  if (!seats || seats.length === 0) {
    return (
      <p className="text-muted text-sm">
        Seat map is not available for this event yet.
      </p>
    );
  }

  const rows = {};

  for (const seat of seats) {
    if (!rows[seat.row_label]) {
      rows[seat.row_label] = [];
    }

    rows[seat.row_label].push(seat);
  }

  const rowLabels = Object.keys(rows).sort();

  return (
    <div className="flex flex-col items-center gap-6 overflow-x-auto">

      {/* SCREEN */}
      <div className="w-full max-w-lg text-center">

        <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-marquee/60 to-transparent mb-1" />

        <span className="text-xs uppercase tracking-[0.3em] text-muted">
          Screen / Stage this way
        </span>

      </div>

      {/* SEATS */}
      <div className="flex flex-col gap-2 min-w-max px-2">

        {rowLabels.map((label) => (

          <div
            key={label}
            className="flex items-center gap-2"
          >

            <span className="w-5 text-xs text-muted text-right">
              {label}
            </span>

            <div className="flex gap-1.5">

              {rows[label]
                .sort(
                  (a, b) =>
                    a.seat_number - b.seat_number
                )
                .map((seat) => {

                  const isSelected =
                    selectedSeats.includes(
                      seat.seat_code
                    );

                  const isCorrectCategory =
                    Number(seat.category_id) ===
                    Number(selectedCategoryId);

                  const clickable =
                    seat.status === 'available' &&
                    isCorrectCategory;

                  // Seat belongs to another category
                  const otherCategory =
                    !isCorrectCategory;

                  return (
                    <button
                      key={seat.seat_code}
                      type="button"
                      disabled={
                        !clickable && !isSelected
                      }
                      title={`${seat.seat_code} · ${seat.category_name} · ₹${seat.price ?? '-'}`}
                      onClick={() => {
                        if (clickable || isSelected) {
                          onToggleSeat(seat);
                        }
                      }}
                      className={`
                        w-8 h-8
                        text-[10px]
                        font-semibold
                        rounded-md
                        border
                        flex
                        items-center
                        justify-center
                        transition

                        ${
                          isSelected
                            ? 'bg-marquee border-marquee text-ink scale-105'
                            : otherCategory
                            ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-30'
                            : STATUS_CLASSES[
                                seat.status
                              ] ||
                              STATUS_CLASSES.unavailable
                        }
                      `}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}

            </div>

          </div>

        ))}

      </div>

      {/* CATEGORY MESSAGE */}
      <div className="text-center text-xs text-muted">
        Seats shown brightly are available for your selected category.
      </div>

    </div>
  );
}