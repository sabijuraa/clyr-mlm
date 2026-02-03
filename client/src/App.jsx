// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';

// Layout Components (import these normally)
import AdminLayout from './components/AdminLayout';

// NEW Admin Pages - Import directly (we created these)
import BrandingPage from './pages/admin/BrandingPage';
import LegalPagesPage from './pages/admin/LegalPagesPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';

// Lazy load existing pages to avoid build errors if they don't exist yet
// This way the app builds even if some pages are missing
const HomePage = lazy(() => import('./pages/public/HomePage').catch(() => ({ default: () => <div>Home Page - Coming Soon</div> })));
const ProductsPage = lazy(() => import('./pages/public/ProductsPage').catch(() => ({ default: () => <div>Products - Coming Soon</div> })));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage').catch(() => ({ default: () => <div>Product Detail - Coming Soon</div> })));
const CheckoutPage = lazy(() => import('./pages/public/CheckoutPage').catch(() => ({ default: () => <div>Checkout - Coming Soon</div> })));
const LoginPage = lazy(() => import('./pages/public/LoginPage').catch(() => ({ default: () => <div>Login - Coming Soon</div> })));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').catch(() => ({ default: () => <div>Dashboard - Coming Soon</div> })));
const AdminProductsPage = lazy(() => import('./pages/admin/ProductsPage').catch(() => ({ default: () => <div>Products Admin - Coming Soon</div> })));
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage').catch(() => ({ default: () => <div>Orders - Coming Soon</div> })));
const AdminPartnersPage = lazy(() => import('./pages/admin/PartnersPage').catch(() => ({ default: () => <div>Partners - Coming Soon</div> })));
const AdminCommissionsPage = lazy(() => import('./pages/admin/CommissionsPage').catch(() => ({ default: () => <div>Commissions - Coming Soon</div> })));

const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard').catch(() => ({ default: () => <div>Partner Dashboard - Coming Soon</div> })));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard').catch(() => ({ default: () => <div>Customer Dashboard - Coming Soon</div> })));

// Lazy load layout components with fallbacks
const Navbar = lazy(() => import('./components/Navbar').catch(() => ({ default: () => <nav className="bg-blue-600 text-white p-4">Navigation</nav> })));
const Footer = lazy(() => import('./components/Footer').catch(() => ({ default: () => <footer className="bg-gray-800 text-white p-4 text-center">© 2026 CLYR</footer> })));

function App() {
  useEffect(() => {
    // Load and apply branding on app start
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      const branding = await res.json();
      
      // Apply CSS variables for colors
      if (branding.primary_color) {
        document.documentElement.style.setProperty('--color-primary', branding.primary_color);
      }
      if (branding.secondary_color) {
        document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
      }
      if (branding.accent_color) {
        document.documentElement.style.setProperty('--color-accent', branding.accent_color);
      }
      
      // Update logo if exists
      const logo = document.querySelector('.navbar-logo');
      if (logo && branding.logo_light_url) {
        logo.src = branding.logo_light_url;
      }
      
      // Update favicon
      if (branding.favicon_url) {
        let favicon = document.querySelector("link[rel*='icon']");
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = branding.favicon_url;
      }
      
      // Update page title if company name exists
      try {
        const companyRes = await fetch('/api/company');
        const company = await companyRes.json();
        if (company.company_name) {
          document.title = company.company_name;
        }
      } catch (err) {
        console.log('Company settings not yet available');
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-xl">Loading...</div></div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <>
                <Navbar />
                <HomePage />
                <Footer />
              </>
            } />
            
            <Route path="/products" element={
              <>
                <Navbar />
                <ProductsPage />
                <Footer />
              </>
            } />
            
            <Route path="/products/:id" element={
              <>
                <Navbar />
                <ProductDetailPage />
                <Footer />
              </>
            } />
            
            <Route path="/checkout" element={
              <>
                <Navbar />
                <CheckoutPage />
                <Footer />
              </>
            } />
            
            <Route path="/login" element={
              <>
                <Navbar />
                <LoginPage />
                <Footer />
              </>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="partners" element={<AdminPartnersPage />} />
              <Route path="commissions" element={<AdminCommissionsPage />} />
              {/* NEW ROUTES - These will work immediately */}
              <Route path="branding" element={<BrandingPage />} />
              <Route path="legal" element={<LegalPagesPage />} />
              <Route path="company" element={<CompanySettingsPage />} />
            </Route>

            {/* Partner Routes */}
            <Route path="/partner" element={<PartnerDashboard />} />

            {/* Customer Routes */}
            <Route path="/customer" element={<CustomerDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;