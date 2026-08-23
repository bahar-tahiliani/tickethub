import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as eventsApi from '../api/events';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrganiserDashboard() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([eventsApi.myEvents(), eventsApi.revenueSummary()])
      .then(([ev, rev]) => {
        setEvents(ev);
        setSummary(rev);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const removeEvent = async (id) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await eventsApi.deleteEvent(id);
      toast.success('Event deleted.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = events.filter((e) => e.event_date >= today).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl tracking-wide">Organiser Dashboard</h1>
        <Link to="/organiser/events/new" className="btn-primary">+ Create Event</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Events" value={events.length} />
        <StatCard label="Upcoming Events" value={upcomingCount} />
        <StatCard label="Total Bookings" value={summary?.totals.totalBookings ?? 0} />
        <StatCard label="Total Revenue" value={`₹${(summary?.totals.totalRevenue ?? 0).toFixed(0)}`} />
      </div>

      <div className="card p-5 mb-8 overflow-x-auto">
        <h2 className="font-display text-2xl tracking-wide mb-4">Revenue by Event</h2>
        {summary?.events.length === 0 ? (
          <p className="text-muted text-sm">No events yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-muted border-b border-white/10">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Venue</th>
                <th className="pb-2 font-medium">Tickets Sold</th>
                <th className="pb-2 font-medium">Available</th>
                <th className="pb-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {summary?.events.map((e) => (
                <tr key={e.event_id} className="border-b border-white/5">
                  <td className="py-2.5">{e.title}</td>
                  <td className="py-2.5">{new Date(`${e.event_date}T00:00:00`).toLocaleDateString()}</td>
                  <td className="py-2.5">{e.venue_name}</td>
                  <td className="py-2.5">{e.tickets_sold}</td>
                  <td className="py-2.5">{e.available_seats}</td>
                  <td className="py-2.5 text-marquee font-semibold">₹{Number(e.revenue).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-2xl tracking-wide mb-4">My Events</h2>
        {events.length === 0 ? (
          <p className="text-muted text-sm">You haven't created any events yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-3 flex-wrap">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted">{e.venue_name} · {new Date(`${e.event_date}T00:00:00`).toLocaleDateString()} · {e.status}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/organiser/events/${e.id}/edit`} className="btn-secondary text-xs py-1.5 px-3">Edit</Link>
                  <button className="btn-danger text-xs py-1.5 px-3" onClick={() => removeEvent(e.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display text-3xl tracking-wide text-marquee">{value}</p>
    </div>
  );
}
