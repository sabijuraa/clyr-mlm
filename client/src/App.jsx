// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CheckoutPage from './pages/public/CheckoutPage';
import LoginPage from './pages/public/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductsPage from './pages/admin/ProductsPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import AdminPartnersPage from './pages/admin/PartnersPage';
import AdminCommissionsPage from './pages/admin/CommissionsPage';
import BrandingPage from './pages/admin/BrandingPage';
import LegalPagesPage from './pages/admin/LegalPagesPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';

// Partner Pages
import PartnerDashboard from './pages/partner/PartnerDashboard';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';

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
      const companyRes = await fetch('/api/company');
      const company = await companyRes.json();
      if (company.company_name) {
        document.title = company.company_name;
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
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
            <Route path="branding" element={<BrandingPage />} />
            <Route path="legal" element={<LegalPagesPage />} />
            <Route path="company" element={<CompanySettingsPage />} />
          </Route>

          {/* Partner Routes */}
          <Route path="/partner" element={<PartnerDashboard />} />

          {/* Customer Routes */}
          <Route path="/customer" element={<CustomerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;