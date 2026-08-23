import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import * as waitlistApi from '../api/waitlist';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const TABS = ['Upcoming', 'Past', 'Cancelled', 'Waitlist'];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([bookingsApi.listMyBookings(), waitlistApi.myWaitlist()])
      .then(([b, w]) => {
        setBookings(b);
        setWaitlist(w);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && b.event_date >= today);
  const past = bookings.filter((b) => b.status === 'confirmed' && b.event_date < today);
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  const cancel = async (id) => {
    if (!confirm('Cancel this booking? Your seat will be released.')) return;
    setCancellingId(id);
    try {
      await bookingsApi.cancelBooking(id);
      toast.success('Booking cancelled and seat released.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const listForTab = { Upcoming: upcoming, Past: past, Cancelled: cancelled, Waitlist: [] }[tab];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="card p-6 mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-marquee/20 text-marquee flex items-center justify-center font-display text-2xl">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide">{user?.name}</h1>
          <p className="text-muted text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-marquee text-ink' : 'bg-surface2 text-muted hover:text-white'
            }`}
          >
            {t} {t !== 'Waitlist' ? `(${{ Upcoming: upcoming, Past: past, Cancelled: cancelled }[t].length})` : `(${waitlist.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === 'Waitlist' ? (
        <WaitlistList waitlist={waitlist} />
      ) : listForTab.length === 0 ? (
        <p className="text-muted text-center py-16">No {tab.toLowerCase()} bookings.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {listForTab.map((b) => (
            <div key={b.id} className="card p-4 flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-surface2 flex items-center justify-center text-2xl shrink-0">
                  {b.poster_url ? <img src={b.poster_url} className="w-full h-full object-cover rounded-lg" alt="" /> : '🎟️'}
                </div>
                <div>
                  <p className="font-semibold">{b.event_title}</p>
                  <p className="text-xs text-muted">{b.venue_name} · {new Date(`${b.event_date}T00:00:00`).toLocaleDateString()} {b.event_time?.slice(0, 5)}</p>
                  <p className="text-xs text-muted mt-0.5">Ref: {b.booking_reference} · ₹{Number(b.total_amount).toFixed(0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                <Link to={`/tickets/${b.id}`} className="btn-secondary text-xs py-1.5 px-3">View Ticket</Link>
                {b.status === 'confirmed' && tab === 'Upcoming' && (
                  <button
                    className="btn-danger text-xs py-1.5 px-3"
                    disabled={cancellingId === b.id}
                    onClick={() => cancel(b.id)}
                  >
                    {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WaitlistList({ waitlist }) {
  if (waitlist.length === 0) return <p className="text-muted text-center py-16">You're not on any waitlists.</p>;
  return (
    <div className="flex flex-col gap-3">
      {waitlist.map((w) => (
        <div key={w.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold">{w.event_title}</p>
            <p className="text-xs text-muted">{w.category_name} · {new Date(`${w.event_date}T00:00:00`).toLocaleDateString()}</p>
          </div>
          <WaitlistBadge status={w.status} />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    confirmed: 'bg-mint/15 text-mint border-mint/30',
    cancelled: 'bg-crimson/15 text-crimson border-crimson/30'
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${styles[status]}`}>{status}</span>;
}

function WaitlistBadge({ status }) {
  const styles = {
    waiting: 'bg-marquee/15 text-marquee border-marquee/30',
    offered: 'bg-mint/15 text-mint border-mint/30',
    fulfilled: 'bg-mint/15 text-mint border-mint/30',
    expired: 'bg-crimson/15 text-crimson border-crimson/30',
    cancelled: 'bg-white/10 text-muted border-white/20'
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${styles[status] || styles.cancelled}`}>{status}</span>;
}
