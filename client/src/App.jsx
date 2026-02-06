import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import CookieConsent from './components/CookieConsent';
import HomePage from './pages/shop/HomePage';
import ShopPage from './pages/shop/ShopPage';
import ProductPage from './pages/shop/ProductPage';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import OrderSuccessPage from './pages/shop/OrderSuccessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import DocumentsPage from './pages/DocumentsPage';
import PartnerRegisterPage from './pages/partner/PartnerRegisterPage';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerTeam from './pages/partner/PartnerTeam';
import PartnerCommissions from './pages/partner/PartnerCommissions';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPartners from './pages/admin/AdminPartners';
import AdminCMS from './pages/admin/AdminCMS';
import LegalPage from './pages/shop/LegalPage';
import FAQPage from './pages/shop/FAQPage';
import MyOrders from './pages/shop/MyOrders';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-clyr-teal border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#2D3436', color: '#fff' } }} />
      <Routes>
        <Route element={<Layout />}>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/impressum" element={<LegalPage slug="impressum" />} />
          <Route path="/datenschutz" element={<LegalPage slug="datenschutz" />} />
          <Route path="/agb" element={<LegalPage slug="agb" />} />
          <Route path="/widerruf" element={<LegalPage slug="widerruf" />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/partner/register" element={<PartnerRegisterPage />} />

          {/* Customer (logged in) */}
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/order/success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />

          {/* Partner */}
          <Route path="/partner/dashboard" element={<ProtectedRoute roles={['partner','admin']}><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/partner/team" element={<ProtectedRoute roles={['partner','admin']}><PartnerTeam /></ProtectedRoute>} />
          <Route path="/partner/commissions" element={<ProtectedRoute roles={['partner','admin']}><PartnerCommissions /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute roles={['admin']}><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/partners" element={<ProtectedRoute roles={['admin']}><AdminPartners /></ProtectedRoute>} />
          <Route path="/admin/cms" element={<ProtectedRoute roles={['admin']}><AdminCMS /></ProtectedRoute>} />
        </Route>
      </Routes>
      <CookieConsent />
    </>
  );
}
