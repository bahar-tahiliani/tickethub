import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as eventsApi from '../api/events';
import * as venuesApi from '../api/venues';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrganiserEventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [prices, setPrices] = useState({}); // { categoryId: price }
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'movie',
    posterUrl: '',
    venueId: '',
    eventDate: '',
    eventTime: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    venuesApi.listVenues().then(setVenues);
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    eventsApi.getEvent(id).then((ev) => {
      setForm({
        title: ev.title,
        description: ev.description || '',
        eventType: ev.event_type,
        posterUrl: ev.poster_url || '',
        venueId: String(ev.venue_id),
        eventDate: ev.event_date,
        eventTime: ev.event_time?.slice(0, 5)
      });
      const priceMap = {};
      ev.prices.forEach((p) => (priceMap[p.category_id] = p.price));
      setPrices(priceMap);
      setLoading(false);
    });
  }, [id, isEdit]);

  useEffect(() => {
    if (!form.venueId) {
      setCategories([]);
      return;
    }
    venuesApi.getVenue(form.venueId).then((v) => setCategories(v.categories || []));
  }, [form.venueId]);

  const submit = async (e) => {
    e.preventDefault();
    const priceList = categories.map((c) => ({ categoryId: c.id, price: Number(prices[c.id] || 0) }));
    if (priceList.some((p) => !p.price)) {
      return toast.error('Set a price for every seat category.');
    }
    setSaving(true);
    try {
      if (isEdit) {
        await eventsApi.updateEvent(id, { ...form, prices: priceList });
        toast.success('Event updated.');
      } else {
        await eventsApi.createEvent({ ...form, prices: priceList });
        toast.success('Event created.');
      }
      navigate('/organiser');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide mb-6">{isEdit ? 'Edit Event' : 'Create Event'}</h1>

      <form onSubmit={submit} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
              <option value="movie">Movie</option>
              <option value="concert">Concert</option>
            </select>
          </div>
          <div>
            <label className="label">Poster Image URL</label>
            <input className="input" value={form.posterUrl} onChange={(e) => setForm({ ...form, posterUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div>
          <label className="label">Venue</label>
          <select required className="input" value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} disabled={isEdit}>
            <option value="">Select a venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name} · {v.location}</option>
            ))}
          </select>
          {isEdit && <p className="text-xs text-muted mt-1">Venue can't be changed after the event's seat map has been created.</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input required type="date" className="input" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
          <div>
            <label className="label">Time</label>
            <input required type="time" className="input" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} />
          </div>
        </div>

        {categories.length > 0 && (
          <div>
            <label className="label">Ticket Prices</label>
            <div className="flex flex-col gap-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color_code }} />
                  <span className="w-28 text-sm">{c.name}</span>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input"
                    placeholder="Price (₹)"
                    value={prices[c.id] || ''}
                    onChange={(e) => setPrices({ ...prices, [c.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary mt-2" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}
