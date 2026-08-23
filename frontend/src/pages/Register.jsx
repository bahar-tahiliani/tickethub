import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created! Welcome to TicketHub.');
      navigate(user.role === 'organiser' ? '/organiser' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="font-display text-3xl tracking-wide mb-1">Create your account</h1>
        <p className="text-muted text-sm mb-6">Book tickets, or register as an organiser to sell them.</p>

        {error && <p className="text-crimson text-sm mb-4 bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" required minLength={6} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">I want to...</label>
            <div className="flex gap-3">
              {[
                { value: 'customer', label: 'Book tickets' },
                { value: 'organiser', label: 'Sell tickets (Organiser)' }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition ${
                    form.role === opt.value ? 'border-marquee bg-marquee/10 text-marquee' : 'border-white/10 text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          Already have an account? <Link to="/login" className="text-marquee hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
