import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/events?search=${encodeURIComponent(search)}`);
    setMenuOpen(false);
  };

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'organiser' ? '/organiser' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-3xl tracking-wide text-marquee leading-none">TicketHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-muted">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <Link to="/events?type=movie" className="hover:text-white transition">Movies</Link>
          <Link to="/events?type=concert" className="hover:text-white transition">Concerts</Link>
          {user && (
            <Link to={dashboardPath} className="hover:text-white transition">My Bookings</Link>
          )}
        </nav>

        <form onSubmit={submitSearch} className="hidden sm:flex flex-1 max-w-md ml-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="input rounded-r-none"
          />
          <button type="submit" className="btn-primary rounded-l-none px-4">Search</button>
        </form>

        <div className="hidden md:flex items-center gap-3 ml-2 shrink-0">
          {user ? (
            <>
              <span className="text-sm text-muted">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={logout} className="btn-secondary text-sm py-2">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-2">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2">Register</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden ml-auto text-white text-2xl"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t border-white/5 pt-3">
          <form onSubmit={submitSearch} className="flex">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="input rounded-r-none" />
            <button type="submit" className="btn-primary rounded-l-none px-4">Go</button>
          </form>
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/events?type=movie" onClick={() => setMenuOpen(false)}>Movies</Link>
          <Link to="/events?type=concert" onClick={() => setMenuOpen(false)}>Concerts</Link>
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setMenuOpen(false)}>My Bookings</Link>
              <button onClick={logout} className="btn-secondary text-sm py-2 w-max">Logout</button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="btn-secondary text-sm py-2">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2">Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
