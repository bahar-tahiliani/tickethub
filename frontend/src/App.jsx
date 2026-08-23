import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventList from './pages/EventList';
import EventDetails from './pages/EventDetails';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import BookingConfirmation from './pages/BookingConfirmation';
import WaitlistOffer from './pages/WaitlistOffer';
import CustomerDashboard from './pages/CustomerDashboard';
import OrganiserDashboard from './pages/OrganiserDashboard';
import OrganiserEventForm from './pages/OrganiserEventForm';
import AdminDashboard from './pages/AdminDashboard';
import AdminVenueForm from './pages/AdminVenueForm';
import NotFound from './pages/NotFound';
import TicketVerification from './pages/TicketVerification';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/events" element={<EventList />} />

          <Route path="/events/:id" element={<EventDetails />} />

          {/* Customer - Checkout */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute roles={['customer']}>
                <Checkout />
              </ProtectedRoute>
            }
          />

          {/* Customer - Payment */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute roles={['customer']}>
                <Payment />
              </ProtectedRoute>
            }
          />

          {/* Customer - Booking Confirmation */}
          <Route
            path="/booking-confirmation"
            element={
              <ProtectedRoute roles={['customer']}>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          {/* Customer - Existing Ticket */}
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute roles={['customer']}>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          {/* Customer - Waitlist */}
          <Route
            path="/waitlist/offer/:token"
            element={
              <ProtectedRoute roles={['customer']}>
                <WaitlistOffer />
              </ProtectedRoute>
            }
          />

          {/* Customer Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Organiser Dashboard */}
          <Route
            path="/organiser"
            element={
              <ProtectedRoute roles={['organiser']}>
                <OrganiserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Create Event */}
          <Route
            path="/organiser/events/new"
            element={
              <ProtectedRoute roles={['organiser']}>
                <OrganiserEventForm />
              </ProtectedRoute>
            }
          />

          {/* Edit Event */}
          <Route
            path="/organiser/events/:id/edit"
            element={
              <ProtectedRoute roles={['organiser']}>
                <OrganiserEventForm />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Create Venue */}
          <Route
            path="/admin/venues/new"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminVenueForm />
              </ProtectedRoute>
            }
          />

          {/* Edit Venue */}
          <Route
            path="/admin/venues/:id/edit"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminVenueForm />
              </ProtectedRoute>
            }
          />

          {/* Public QR Ticket Verification */}
          <Route
            path="/verify/:reference"
            element={<TicketVerification />}
          />

          {/* 404 */}
          <Route
            path="*"
            element={<NotFound />}
          />

        </Routes>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} TicketHub. Built for movies &amp; concerts everywhere.
      </footer>
    </div>
  );
}