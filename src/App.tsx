import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useEffect } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import OwnerToday from './pages/OwnerToday';
import OwnerAppointments from './pages/OwnerAppointments';
import OwnerClients from './pages/OwnerClients';
import OwnerBarbers from './pages/OwnerBarbers';
import OwnerServices from './pages/OwnerServices';
import OwnerSettings from './pages/OwnerSettings';
import OwnerProducts from './pages/OwnerProducts';
import OwnerReports from './pages/OwnerReports';
import OwnerPayouts from './pages/OwnerPayouts';
import OwnerClientsReport from './pages/OwnerClientsReport';
import OwnerEngage from './pages/OwnerEngage';
import OwnerBarbersTimeTracking from './pages/OwnerBarbersTimeTracking';
import OwnerInventory from './pages/OwnerInventory';
import OwnerInventoryReports from './pages/OwnerInventoryReports';
import OwnerSmsSettings from './pages/OwnerSmsSettings';
import OwnerCalendar from './pages/OwnerCalendar';
import ClientDetail from './pages/ClientDetail';
import AppointmentDetail from './pages/AppointmentDetail';
import BarberToday from './pages/BarberToday';
import BarberStats from './pages/BarberStats';
import BarberCalendar from './pages/BarberCalendar';
import Book from './pages/Book';
import ClientHome from './pages/ClientHome';
import ClientServices from './pages/ClientServices';
import ClientBarbers from './pages/ClientBarbers';
import ClientBook from './pages/ClientBook';
import ClientBookSuccess from './pages/ClientBookSuccess';
import ClientProducts from './pages/ClientProducts';
import ClientAppointments from './pages/ClientAppointments';
import AccountSettings from './pages/AccountSettings';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Hostname detection utilities
const getHostname = () => window.location.hostname;
const isAdminDomain = () => {
  const hostname = getHostname();
  return hostname.startsWith('admin.') || hostname === 'localhost' || hostname === '127.0.0.1';
};
const isClientDomain = () => !isAdminDomain();

const getAdminUrl = () => {
  const adminUrl = import.meta.env.VITE_ADMIN_URL;
  return adminUrl || 'https://admin.lupesbarbershop.com';
};

// Component to redirect admin routes to admin subdomain
function AdminRouteGuard({ children }: { children: JSX.Element }) {
  const location = useLocation();

  useEffect(() => {
    // If we're on the client domain and trying to access admin routes, redirect to admin domain
    if (isClientDomain()) {
      const adminUrl = getAdminUrl();
      const fullAdminUrl = `${adminUrl}${location.pathname}${location.search}${location.hash}`;
      window.location.href = fullAdminUrl;
    }
  }, [location]);

  // If on client domain, show loading while redirect happens
  if (isClientDomain()) {
    return <LoadingSpinner message="Redirecting to admin panel..." />;
  }

  return children;
}

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element; allowedRole?: 'OWNER' | 'BARBER' }) {
  const { user, userData, loading, error } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading your account..." />;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Authentication Error</h2>
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <a href="/login" style={{ color: '#0066cc' }}>Return to Login</a>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && userData.role !== allowedRole) {
    return <Navigate to={userData.role === 'OWNER' ? '/owner/today' : '/barber/today'} />;
  }

  return children;
}

function AppRoutes() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <Routes>
      {/* Admin routes - redirect to admin subdomain if accessed from client domain */}
      <Route path="/login" element={
        <AdminRouteGuard>
          {user ? <Navigate to={userData?.role === 'OWNER' ? '/owner/today' : '/barber/today'} /> : <Login />}
        </AdminRouteGuard>
      } />

      {/* Legacy booking route - can be accessed from both domains */}
      <Route path="/book" element={<Book />} />

      {/* Public legal pages */}
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Client-facing routes - always accessible */}
      <Route path="/client" element={<Navigate to="/client/home" />} />
      <Route path="/client/home" element={<ClientHome />} />
      <Route path="/client/services" element={<ClientServices />} />
      <Route path="/client/barbers" element={<ClientBarbers />} />
      <Route path="/client/products" element={<ClientProducts />} />
      <Route path="/client/book" element={<ClientBook />} />
      <Route path="/client/book/success" element={<ClientBookSuccess />} />
      <Route path="/client/success" element={<ClientBookSuccess />} />
      <Route path="/client/appointments" element={<ClientAppointments />} />

      {/* Owner routes - admin subdomain only */}
      <Route path="/owner/today" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerToday /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/appointments" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerAppointments /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/clients" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerClients /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/barbers" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerBarbers /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/services" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerServices /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/products" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerProducts /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/settings" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerSettings /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/reports" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerReports /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/payouts" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerPayouts /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/clients-report" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerClientsReport /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/barbers-time-tracking" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerBarbersTimeTracking /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/inventory" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerInventory /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/inventory-reports" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerInventoryReports /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/engage" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerEngage /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/sms-settings" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerSmsSettings /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/calendar" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><OwnerCalendar /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/clients/:clientId" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><ClientDetail /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/appointments/:appointmentId" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><AppointmentDetail /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/owner/account" element={<AdminRouteGuard><ProtectedRoute allowedRole="OWNER"><AccountSettings /></ProtectedRoute></AdminRouteGuard>} />

      {/* Barber routes - admin subdomain only */}
      <Route path="/barber/today" element={<AdminRouteGuard><ProtectedRoute allowedRole="BARBER"><BarberToday /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/barber/calendar" element={<AdminRouteGuard><ProtectedRoute allowedRole="BARBER"><BarberCalendar /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/barber/stats" element={<AdminRouteGuard><ProtectedRoute allowedRole="BARBER"><BarberStats /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/barber/appointments/:appointmentId" element={<AdminRouteGuard><ProtectedRoute allowedRole="BARBER"><AppointmentDetail /></ProtectedRoute></AdminRouteGuard>} />
      <Route path="/barber/account" element={<AdminRouteGuard><ProtectedRoute allowedRole="BARBER"><AccountSettings /></ProtectedRoute></AdminRouteGuard>} />

      {/* Root route - different behavior based on domain */}
      <Route path="/" element={
        isClientDomain()
          ? <Navigate to="/client/home" />
          : user
          ? <Navigate to={userData?.role === 'OWNER' ? '/owner/today' : '/barber/today'} />
          : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
