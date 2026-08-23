import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as venuesApi from '../api/venues';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function rowLabelForIndex(index) {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export default function AdminVenueForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [venue, setVenue] = useState({ name: '', location: '', numRows: 6, seatsPerRow: 10 });
  const [venueId, setVenueId] = useState(id || null);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', colorCode: '#F4B740' });
  const [rowCategoryMap, setRowCategoryMap] = useState({});
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!venueId) return;
    venuesApi.getVenue(venueId).then((v) => {
      setVenue({ name: v.name, location: v.location, numRows: v.num_rows, seatsPerRow: v.seats_per_row });
      setCategories(v.categories || []);
      setSeats(v.seats || []);
      setLoading(false);
    });
  };

  useEffect(load, [venueId]);

  const rowLabels = Array.from({ length: Number(venue.numRows) || 0 }, (_, i) => rowLabelForIndex(i));

  const saveVenueDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (venueId) {
        await venuesApi.updateVenue(venueId, venue);
        toast.success('Venue updated.');
      } else {
        const created = await venuesApi.createVenue(venue);
        setVenueId(created.id);
        toast.success('Venue created. Now add seat categories below.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) return;
    try {
      await venuesApi.createSeatCategory(venueId, newCategory);
      setNewCategory({ name: '', colorCode: '#F4B740' });
      toast.success('Category added.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const generateLayout = async () => {
    if (categories.length === 0) return toast.error('Add at least one seat category first.');
    try {
      await venuesApi.generateSeatLayout(venueId, rowCategoryMap);
      toast.success('Seat layout generated.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl tracking-wide mb-6">{venueId ? 'Manage Venue' : 'Create Venue'}</h1>
        <form onSubmit={saveVenueDetails} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="label">Venue Name</label>
            <input required className="input" value={venue.name} onChange={(e) => setVenue({ ...venue, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Location</label>
            <input required className="input" value={venue.location} onChange={(e) => setVenue({ ...venue, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Number of Rows</label>
              <input required type="number" min="1" max="26" className="input" value={venue.numRows} onChange={(e) => setVenue({ ...venue, numRows: e.target.value })} />
            </div>
            <div>
              <label className="label">Seats per Row</label>
              <input required type="number" min="1" max="50" className="input" value={venue.seatsPerRow} onChange={(e) => setVenue({ ...venue, seatsPerRow: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : venueId ? 'Save Venue Details' : 'Create Venue'}</button>
        </form>
      </div>

      {venueId && (
        <>
          <div>
            <h2 className="font-display text-2xl tracking-wide mb-4">Seat Categories</h2>
            <div className="card p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <span key={c.id} className="flex items-center gap-2 bg-surface2 rounded-full px-3 py-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color_code }} />
                    {c.name}
                  </span>
                ))}
                {categories.length === 0 && <p className="text-muted text-sm">No categories yet - add one below (e.g. Premium, Standard).</p>}
              </div>
              <form onSubmit={addCategory} className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="label">Category Name</label>
                  <input className="input" placeholder="Premium" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Color</label>
                  <input type="color" className="h-[42px] w-16 rounded-lg bg-surface2 border border-white/10" value={newCategory.colorCode} onChange={(e) => setNewCategory({ ...newCategory, colorCode: e.target.value })} />
                </div>
                <button className="btn-secondary">Add Category</button>
              </form>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl tracking-wide mb-4">Seat Layout</h2>
            <div className="card p-6">
              <p className="text-sm text-muted mb-4">Assign each row to a seat category, then generate the layout. Regenerating will replace any existing seats for this venue.</p>
              <div className="flex flex-col gap-2 mb-5 max-h-72 overflow-y-auto pr-2">
                {rowLabels.map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-muted">Row {label}</span>
                    <select
                      className="input"
                      value={rowCategoryMap[label] || ''}
                      onChange={(e) => setRowCategoryMap({ ...rowCategoryMap, [label]: e.target.value })}
                    >
                      <option value="">{categories[0]?.name || 'Default'} (default)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={generateLayout}>Generate Seat Layout</button>

              {seats.length > 0 && (
                <p className="text-xs text-mint mt-4">✓ {seats.length} seats currently configured for this venue.</p>
              )}
            </div>
          </div>

          <button className="btn-secondary w-max" onClick={() => navigate('/admin')}>Back to Admin Dashboard</button>
        </>
      )}
    </div>
  );
}
