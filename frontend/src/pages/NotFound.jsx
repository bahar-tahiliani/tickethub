import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="font-display text-7xl text-marquee mb-2">404</p>
      <h1 className="font-display text-2xl tracking-wide mb-3">Page Not Found</h1>
      <p className="text-muted mb-6">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
