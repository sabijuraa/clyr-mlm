import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CartPage from './pages/public/CartPage';
import CheckoutPage from './pages/public/CheckoutPage';
import OrderConfirmationPage from './pages/public/OrderConfirmationPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import PartnerRegisterPage from './pages/auth/PartnerRegisterPage';
import AdminSetupPage from './pages/auth/AdminSetupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import TeamPage from './pages/dashboard/TeamPage';
import ReferralLinksPage from './pages/dashboard/ReferralLinksPage';
import CommissionsPage from './pages/dashboard/CommissionsPage';
import CustomersPage from './pages/dashboard/CustomersPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import OrdersPage from './pages/dashboard/OrdersPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminPartnersPage from './pages/admin/AdminPartnersPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCommissionsPage from './pages/admin/AdminCommissionsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Legal Pages
import ImprintPage from './pages/legal/ImprintPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import WithdrawalPage from './pages/legal/WithdrawalPage';

// Loading Spinner
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-teal-200 rounded-full animate-spin border-t-teal-500" />
      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-teal-300" />
    </div>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/produkte" element={<ProductsPage />} />
        <Route path="/produkt/:slug" element={<ProductDetailPage />} />
        <Route path="/warenkorb" element={<CartPage />} />
        <Route path="/kasse" element={<CheckoutPage />} />
        <Route path="/bestellung/:orderId" element={<OrderConfirmationPage />} />
        <Route path="/impressum" element={<ImprintPage />} />
        <Route path="/datenschutz" element={<PrivacyPage />} />
        <Route path="/agb" element={<TermsPage />} />
        <Route path="/widerruf" element={<WithdrawalPage />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/partner-werden" element={<PartnerRegisterPage />} />
      <Route path="/admin-setup" element={<AdminSetupPage />} />
      <Route path="/passwort-vergessen" element={<ForgotPasswordPage />} />

      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="links" element={<ReferralLinksPage />} />
        <Route path="provisionen" element={<CommissionsPage />} />
        <Route path="kunden" element={<CustomersPage />} />
        <Route path="bestellungen" element={<OrdersPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="partner" element={<AdminPartnersPage />} />
        <Route path="bestellungen" element={<AdminOrdersPage />} />
        <Route path="produkte" element={<AdminProductsPage />} />
        <Route path="provisionen" element={<AdminCommissionsPage />} />
        <Route path="einstellungen" element={<AdminSettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;