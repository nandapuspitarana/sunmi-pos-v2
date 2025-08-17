import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminPayments from './pages/admin/Payments';
import AdminVisitors from './pages/admin/Visitors';
import AdminQRCodes from './pages/admin/QRCodes';
import AdminSettings from './pages/admin/Settings';
import EntryPage from './pages/EntryPage';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import GateStatusPage from './pages/GateStatusPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
// Layout component not needed as we use AdminLayout directly
import AdminLayout from './components/AdminLayout';
import NotificationToast from './components/NotificationToast';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { connectSocket, disconnectSocket } = useAppStore();

  useEffect(() => {
    // Check authentication on app start
    checkAuth();
    
    // Connect socket for real-time features
    connectSocket();
    
    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NotificationToast />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/entry" element={<EntryPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/gate/status" element={<GateStatusPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="visitors" element={<AdminVisitors />} />
            <Route path="qrcodes" element={<AdminQRCodes />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Default Route */}
          <Route path="/" element={
            isAuthenticated ? 
              <Navigate to="/admin/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
