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
import GdprPage from './pages/public/GdprPage';

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
import AdminCMSPage from './pages/admin/AdminCMSPage';
import AdminInvoicesPage from './pages/admin/AdminInvoicesPage';
import AdminVariantsPage from './pages/admin/AdminVariantsPage';
import AdminImportPage from './pages/admin/AdminImportPage';
import AdminVatReportsPage from './pages/admin/AdminVatReportsPage';
import AdminCreditNotesPage from './pages/admin/AdminCreditNotesPage';

// Customer Portal Pages
import CustomerLoginPage from './pages/customer/CustomerLoginPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';

// Cookie Consent
import CookieConsentBanner from './components/CookieConsentBanner';

// Legal Pages
import ImprintPage from './pages/legal/ImprintPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import WithdrawalPage from './pages/legal/WithdrawalPage';

// Loading Spinner - Charcoal with teal accent
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-secondary-200 rounded-full animate-spin border-t-secondary-700" />
      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary-400 opacity-30" />
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
    <>
      <CookieConsentBanner />
      <Routes>
      {/* Public Routes - English paths */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order/:orderId" element={<OrderConfirmationPage />} />
        <Route path="/imprint" element={<ImprintPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/withdrawal" element={<WithdrawalPage />} />
        <Route path="/gdpr" element={<GdprPage />} />
        <Route path="/gdpr/export" element={<GdprPage />} />
        <Route path="/gdpr/delete" element={<GdprPage />} />
      </Route>

      {/* German route redirects for backwards compatibility */}
      <Route path="/produkte" element={<Navigate to="/products" replace />} />
      <Route path="/produkt/:slug" element={<Navigate to="/product/:slug" replace />} />
      <Route path="/warenkorb" element={<Navigate to="/cart" replace />} />
      <Route path="/kasse" element={<Navigate to="/checkout" replace />} />
      <Route path="/bestellung/:orderId" element={<Navigate to="/order/:orderId" replace />} />
      <Route path="/impressum" element={<Navigate to="/imprint" replace />} />
      <Route path="/datenschutz" element={<Navigate to="/privacy" replace />} />
      <Route path="/agb" element={<Navigate to="/terms" replace />} />
      <Route path="/widerruf" element={<Navigate to="/withdrawal" replace />} />
      <Route path="/partner-werden" element={<Navigate to="/partner/register" replace />} />
      <Route path="/passwort-vergessen" element={<Navigate to="/forgot-password" replace />} />

      {/* Auth Routes - English paths */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/partner/register" element={<PartnerRegisterPage />} />
      <Route path="/admin-setup" element={<AdminSetupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Dashboard Routes - English paths */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="links" element={<ReferralLinksPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Dashboard German route redirects */}
      <Route path="/dashboard/provisionen" element={<Navigate to="/dashboard/commissions" replace />} />
      <Route path="/dashboard/kunden" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="/dashboard/bestellungen" element={<Navigate to="/dashboard/orders" replace />} />
      <Route path="/dashboard/profil" element={<Navigate to="/dashboard/profile" replace />} />

      {/* Admin Routes - English paths */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="partners" element={<AdminPartnersPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="variants" element={<AdminVariantsPage />} />
        <Route path="commissions" element={<AdminCommissionsPage />} />
        <Route path="invoices" element={<AdminInvoicesPage />} />
        <Route path="cms" element={<AdminCMSPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="imports" element={<AdminImportPage />} />
        <Route path="vat-reports" element={<AdminVatReportsPage />} />
        <Route path="credit-notes" element={<AdminCreditNotesPage />} />
      </Route>

      {/* Customer Portal Routes */}
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />

      {/* Admin German route redirects */}
      <Route path="/admin/partner" element={<Navigate to="/admin/partners" replace />} />
      <Route path="/admin/bestellungen" element={<Navigate to="/admin/orders" replace />} />
      <Route path="/admin/produkte" element={<Navigate to="/admin/products" replace />} />
      <Route path="/admin/provisionen" element={<Navigate to="/admin/commissions" replace />} />
      <Route path="/admin/einstellungen" element={<Navigate to="/admin/settings" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
