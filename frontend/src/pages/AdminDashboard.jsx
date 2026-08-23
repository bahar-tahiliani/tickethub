import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as venuesApi from '../api/venues';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const TABS = ['Overview', 'Venues', 'Organisers', 'Events', 'Bookings'];

export default function AdminDashboard() {
  const toast = useToast();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [organisers, setOrganisers] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      venuesApi.adminStats(),
      venuesApi.listVenues(),
      venuesApi.adminOrganisers(),
      venuesApi.adminEvents(),
      venuesApi.adminBookings()
    ])
      .then(([s, v, o, e, b]) => {
        setStats(s);
        setVenues(v);
        setOrganisers(o);
        setEvents(e);
        setBookings(b);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const removeVenue = async (id) => {
    if (!confirm('Delete this venue? Associated events and seats will be removed too.')) return;
    try {
      await venuesApi.deleteVenue(id);
      toast.success('Venue deleted.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl tracking-wide mb-6">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-marquee text-ink' : 'bg-surface2 text-muted hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Customers" value={stats.total_customers} />
          <StatCard label="Total Organisers" value={stats.total_organisers} />
          <StatCard label="Total Events" value={stats.total_events} />
          <StatCard label="Total Venues" value={stats.total_venues} />
          <StatCard label="Total Bookings" value={stats.total_bookings} />
          <StatCard label="Total Revenue" value={`₹${Number(stats.total_revenue).toFixed(0)}`} />
        </div>
      )}

      {tab === 'Venues' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link to="/admin/venues/new" className="btn-primary">+ New Venue</Link>
          </div>
          <div className="flex flex-col gap-2">
            {venues.map((v) => (
              <div key={v.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted">{v.location} · {v.num_rows} rows × {v.seats_per_row} seats</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/venues/${v.id}/edit`} className="btn-secondary text-xs py-1.5 px-3">Manage Layout</Link>
                  <button className="btn-danger text-xs py-1.5 px-3" onClick={() => removeVenue(v.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Organisers' && (
        <Table
          headers={['Name', 'Email', 'Joined']}
          rows={organisers.map((o) => [o.name, o.email, new Date(o.created_at).toLocaleDateString()])}
        />
      )}

      {tab === 'Events' && (
        <Table
          headers={['Title', 'Type', 'Organiser', 'Venue', 'Date', 'Status']}
          rows={events.map((e) => [e.title, e.event_type, e.organiser_name, e.venue_name, new Date(`${e.event_date}T00:00:00`).toLocaleDateString(), e.status])}
        />
      )}

      {tab === 'Bookings' && (
        <Table
          headers={['Reference', 'Event', 'Customer', 'Amount', 'Status', 'Date']}
          rows={bookings.map((b) => [b.booking_reference, b.event_title, b.customer_name, `₹${Number(b.total_amount).toFixed(0)}`, b.status, new Date(b.created_at).toLocaleDateString()])}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display text-3xl tracking-wide text-marquee">{value}</p>
    </div>
  );
}

function Table({ headers, rows }) {
  if (rows.length === 0) return <p className="text-muted text-center py-16">No data yet.</p>;
  return (
    <div className="card p-5 overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-left text-muted border-b border-white/10">
            {headers.map((h) => (
              <th key={h} className="pb-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 capitalize">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
