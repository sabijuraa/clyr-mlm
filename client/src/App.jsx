// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import ScrollToTop from './components/common/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import AdminLayout from './components/AdminLayout';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy-load all pages for better performance
import { lazy, Suspense } from 'react';
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
  </div>
);

// Public pages
const HomePage = lazy(() => import('./pages/public/HomePage'));
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/public/CartPage'));
const CheckoutPage = lazy(() => import('./pages/public/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/public/OrderConfirmationPage'));
const GdprPage = lazy(() => import('./pages/public/GdprPage'));
const FaqPage = lazy(() => import('./pages/public/FaqPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));

// Cookie Consent
import CookieConsent from './components/common/CookieConsent';

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const PartnerRegisterPage = lazy(() => import('./pages/auth/PartnerRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AdminSetupPage = lazy(() => import('./pages/auth/AdminSetupPage'));

// Legal pages
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PartnerTermsPage = lazy(() => import('./pages/legal/PartnerTermsPage'));
const ImprintPage = lazy(() => import('./pages/legal/ImprintPage'));
const WithdrawalPage = lazy(() => import('./pages/legal/WithdrawalPage'));

// Customer pages
const CustomerLoginPage = lazy(() => import('./pages/customer/CustomerLoginPage'));
const CustomerDashboardPage = lazy(() => import('./pages/customer/CustomerDashboardPage'));

// Partner dashboard pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const CommissionsPage = lazy(() => import('./pages/dashboard/CommissionsPage'));
const TeamPage = lazy(() => import('./pages/dashboard/TeamPage'));
const CustomersPage = lazy(() => import('./pages/dashboard/CustomersPage'));
const OrdersPage = lazy(() => import('./pages/dashboard/OrdersPage'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const ReferralLinksPage = lazy(() => import('./pages/dashboard/ReferralLinksPage'));
const PayoutsPage = lazy(() => import('./pages/dashboard/PayoutsPage'));
const AcademyPage = lazy(() => import('./pages/dashboard/AcademyPage'));
const CompliancePage = lazy(() => import('./pages/dashboard/CompliancePage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminPartnersPage = lazy(() => import('./pages/admin/AdminPartnersPage'));
const AdminCommissionsPage = lazy(() => import('./pages/admin/AdminCommissionsPage'));
const AdminInvoicesPage = lazy(() => import('./pages/admin/AdminInvoicesPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminCMSPage = lazy(() => import('./pages/admin/AdminCMSPage'));
const AdminVariantsPage = lazy(() => import('./pages/admin/AdminVariantsPage'));
const AdminVatReportsPage = lazy(() => import('./pages/admin/AdminVatReportsPage'));
const AdminCreditNotesPage = lazy(() => import('./pages/admin/AdminCreditNotesPage'));
const AdminNewsletterPage = lazy(() => import('./pages/admin/AdminNewsletterPage'));
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage'));
const BrandingPage = lazy(() => import('./pages/admin/BrandingPage'));
const LegalPagesPage = lazy(() => import('./pages/admin/LegalPagesPage'));
const CompanySettingsPage = lazy(() => import('./pages/admin/CompanySettingsPage'));
const AdminAcademyPage = lazy(() => import('./pages/admin/AdminAcademyPage'));

// Route guards
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
};

function App() {
  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      if (!res.ok) return;
      const branding = await res.json();
      
      if (branding.primary_color) document.documentElement.style.setProperty('--color-primary', branding.primary_color);
      if (branding.secondary_color) document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
      if (branding.accent_color) document.documentElement.style.setProperty('--color-accent', branding.accent_color);
      
      if (branding.favicon_url) {
        let favicon = document.querySelector("link[rel*='icon']");
        if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
        favicon.href = branding.favicon_url;
      }
    } catch (error) {
      console.log('Branding not yet configured');
    }
  };

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ====== PUBLIC ROUTES (with Navbar + Footer) ====== */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ProductsPage />} />
              <Route path="/shop/:slug" element={<ProductDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/gdpr" element={<GdprPage />} />
              
              {/* ====== LEGAL ====== */}
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/partner-terms" element={<PartnerTermsPage />} />
              <Route path="/imprint" element={<ImprintPage />} />
              <Route path="/withdrawal" element={<WithdrawalPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/ueber-uns" element={<AboutPage />} />
              
              {/* ====== AUTH ====== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<PartnerRegisterPage />} />
              <Route path="/partner/register" element={<PartnerRegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/setup" element={<AdminSetupPage />} />
              
              {/* ====== CUSTOMER PORTAL ====== */}
              <Route path="/customer/login" element={<CustomerLoginPage />} />
              <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            </Route>
            
            {/* ====== PARTNER DASHBOARD ====== */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="commissions" element={<CommissionsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="referral-links" element={<ReferralLinksPage />} />
              <Route path="links" element={<ReferralLinksPage />} />
              <Route path="payouts" element={<PayoutsPage />} />
              <Route path="academy" element={<AcademyPage />} />
              <Route path="compliance" element={<CompliancePage />} />
            </Route>
            
            {/* ====== ADMIN ====== */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="partners" element={<AdminPartnersPage />} />
              <Route path="commissions" element={<AdminCommissionsPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="cms" element={<AdminCMSPage />} />
              <Route path="variants" element={<AdminVariantsPage />} />
              <Route path="vat-reports" element={<AdminVatReportsPage />} />
              <Route path="credit-notes" element={<AdminCreditNotesPage />} />
              <Route path="import" element={<AdminImportPage />} />
              <Route path="branding" element={<BrandingPage />} />
              <Route path="legal" element={<LegalPagesPage />} />
              <Route path="newsletter" element={<AdminNewsletterPage />} />
              <Route path="academy" element={<AdminAcademyPage />} />
              <Route path="company" element={<CompanySettingsPage />} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
        <CookieConsent />
      </div>
    </>
  );
}

export default App;