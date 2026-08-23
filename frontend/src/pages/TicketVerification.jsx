import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = 'http://localhost:5002/api';

export default function TicketVerification() {
  const { reference } = useParams();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyTicket = async () => {
      try {
        const response = await fetch(
          `${API_URL}/tickets/verify/${reference}`
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.data.valid) {
          throw new Error('Invalid ticket');
        }

        setTicket(result.data);
      } catch (err) {
        setError('This ticket is invalid or could not be verified.');
      } finally {
        setLoading(false);
      }
    };

    verifyTicket();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#120d1a] text-white">
        <h2>Verifying ticket...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#120d1a] text-red-400">
        <h2>{error}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120d1a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#211b33] rounded-2xl p-8 shadow-xl">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✅</div>

          <h1 className="text-3xl font-bold text-yellow-400">
            TICKET VERIFIED
          </h1>

          <p className="text-gray-400 mt-2">
            This ticket is valid and confirmed.
          </p>
        </div>

        <div className="space-y-5">

          <div>
            <p className="text-gray-400 text-sm">Booking Reference</p>
            <p className="text-xl font-bold">
              {ticket.bookingReference}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Event</p>
            <p className="text-lg font-semibold">
              {ticket.eventTitle}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Venue</p>
            <p>{ticket.venueName}</p>
            <p className="text-gray-400 text-sm">
              {ticket.venueLocation}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <p className="text-gray-400 text-sm">Date</p>
              <p>{ticket.eventDate}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Time</p>
              <p>{ticket.eventTime}</p>
            </div>

          </div>

          <div>
            <p className="text-gray-400 text-sm">Seats</p>

            <div className="flex gap-2 mt-2">
              {ticket.seats.map((seat) => (
                <span
                  key={seat.seatCode}
                  className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400"
                >
                  {seat.seatCode}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Amount Paid</p>
            <p className="text-2xl font-bold text-yellow-400">
              ₹{ticket.totalAmount}
            </p>
          </div>

          <div className="border-t border-gray-700 pt-5">
            <p className="text-green-400 font-bold text-center">
              ✓ CONFIRMED
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}