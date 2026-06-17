import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PanoramaPage } from './pages/PanoramaPage';
import { EditorPage } from './pages/EditorPage';
import { ClientsPage } from './pages/ClientsPage';
import { EyewearPage } from './pages/EyewearPage';
import { LensesPage } from './pages/LensesPage';
import { AtelierPage } from './pages/AtelierPage';
import { DeskPage } from './pages/DeskPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AdminPage } from './pages/AdminPage';
import { OrdersPage } from './pages/OrdersPage';
import { ClientProfilePage } from './pages/ClientProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/" element={<ProtectedRoute><PanoramaPage /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/module/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/module/clients/:id" element={<ProtectedRoute><ClientProfilePage /></ProtectedRoute>} />
          <Route path="/module/eyewear" element={<ProtectedRoute><EyewearPage /></ProtectedRoute>} />
          <Route path="/module/lenses" element={<ProtectedRoute><LensesPage /></ProtectedRoute>} />
          <Route path="/module/atelier" element={<ProtectedRoute><AtelierPage /></ProtectedRoute>} />
          <Route path="/module/desk" element={<ProtectedRoute><DeskPage /></ProtectedRoute>} />
          <Route path="/module/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />

          <Route path="/employees" element={<ProtectedRoute roles={['OPTICIAN']}><EmployeesPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['DEVELOPER']}><AdminPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
