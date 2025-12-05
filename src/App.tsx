import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
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

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element; allowedRole?: 'OWNER' | 'BARBER' }) {
  const { user, userData, loading, error } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={userData?.role === 'OWNER' ? '/owner/today' : '/barber/today'} /> : <Login />} />
      <Route path="/book" element={<Book />} />

      <Route path="/client" element={<Navigate to="/client/home" />} />
      <Route path="/client/home" element={<ClientHome />} />
      <Route path="/client/services" element={<ClientServices />} />
      <Route path="/client/barbers" element={<ClientBarbers />} />
      <Route path="/client/products" element={<ClientProducts />} />
      <Route path="/client/book" element={<ClientBook />} />
      <Route path="/client/book/success" element={<ClientBookSuccess />} />
      <Route path="/client/appointments" element={<ClientAppointments />} />

      <Route path="/owner/today" element={<ProtectedRoute allowedRole="OWNER"><OwnerToday /></ProtectedRoute>} />
      <Route path="/owner/appointments" element={<ProtectedRoute allowedRole="OWNER"><OwnerAppointments /></ProtectedRoute>} />
      <Route path="/owner/clients" element={<ProtectedRoute allowedRole="OWNER"><OwnerClients /></ProtectedRoute>} />
      <Route path="/owner/barbers" element={<ProtectedRoute allowedRole="OWNER"><OwnerBarbers /></ProtectedRoute>} />
      <Route path="/owner/services" element={<ProtectedRoute allowedRole="OWNER"><OwnerServices /></ProtectedRoute>} />
      <Route path="/owner/products" element={<ProtectedRoute allowedRole="OWNER"><OwnerProducts /></ProtectedRoute>} />
      <Route path="/owner/settings" element={<ProtectedRoute allowedRole="OWNER"><OwnerSettings /></ProtectedRoute>} />
      <Route path="/owner/reports" element={<ProtectedRoute allowedRole="OWNER"><OwnerReports /></ProtectedRoute>} />
      <Route path="/owner/payouts" element={<ProtectedRoute allowedRole="OWNER"><OwnerPayouts /></ProtectedRoute>} />
      <Route path="/owner/clients-report" element={<ProtectedRoute allowedRole="OWNER"><OwnerClientsReport /></ProtectedRoute>} />
      <Route path="/owner/barbers-time-tracking" element={<ProtectedRoute allowedRole="OWNER"><OwnerBarbersTimeTracking /></ProtectedRoute>} />
      <Route path="/owner/inventory" element={<ProtectedRoute allowedRole="OWNER"><OwnerInventory /></ProtectedRoute>} />
      <Route path="/owner/inventory-reports" element={<ProtectedRoute allowedRole="OWNER"><OwnerInventoryReports /></ProtectedRoute>} />
      <Route path="/owner/engage" element={<ProtectedRoute allowedRole="OWNER"><OwnerEngage /></ProtectedRoute>} />
      <Route path="/owner/sms-settings" element={<ProtectedRoute allowedRole="OWNER"><OwnerSmsSettings /></ProtectedRoute>} />
      <Route path="/owner/calendar" element={<ProtectedRoute allowedRole="OWNER"><OwnerCalendar /></ProtectedRoute>} />
      <Route path="/owner/clients/:clientId" element={<ProtectedRoute allowedRole="OWNER"><ClientDetail /></ProtectedRoute>} />
      <Route path="/owner/appointments/:appointmentId" element={<ProtectedRoute allowedRole="OWNER"><AppointmentDetail /></ProtectedRoute>} />

      <Route path="/barber/today" element={<ProtectedRoute allowedRole="BARBER"><BarberToday /></ProtectedRoute>} />
      <Route path="/barber/calendar" element={<ProtectedRoute allowedRole="BARBER"><BarberCalendar /></ProtectedRoute>} />
      <Route path="/barber/stats" element={<ProtectedRoute allowedRole="BARBER"><BarberStats /></ProtectedRoute>} />
      <Route path="/barber/appointments/:appointmentId" element={<ProtectedRoute allowedRole="BARBER"><AppointmentDetail /></ProtectedRoute>} />

      <Route path="/" element={
        user
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
