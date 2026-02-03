// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CheckoutPage from './pages/public/CheckoutPage';
import LoginPage from './pages/auth/LoginPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminPartnersPage from './pages/admin/AdminPartnersPage';
import AdminCommissionsPage from './pages/admin/AdminCommissionsPage';
import BrandingPage from './pages/admin/BrandingPage';
import LegalPagesPage from './pages/admin/LegalPagesPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';

// Partner Pages
import DashboardPage from './pages/dashboard/DashboardPage';

// Customer Pages
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AdminLayout from './components/AdminLayout';

function App() {
  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      const branding = await res.json();
      
      if (branding.primary_color) {
        document.documentElement.style.setProperty('--color-primary', branding.primary_color);
      }
      if (branding.secondary_color) {
        document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
      }
      if (branding.accent_color) {
        document.documentElement.style.setProperty('--color-accent', branding.accent_color);
      }
      
      const logo = document.querySelector('.navbar-logo');
      if (logo && branding.logo_light_url) {
        logo.src = branding.logo_light_url;
      }
      
      if (branding.favicon_url) {
        let favicon = document.querySelector("link[rel*='icon']");
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = branding.favicon_url;
      }
      
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
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="partners" element={<AdminPartnersPage />} />
            <Route path="commissions" element={<AdminCommissionsPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="legal" element={<LegalPagesPage />} />
            <Route path="company" element={<CompanySettingsPage />} />
          </Route>

          {/* Partner Routes */}
          <Route path="/partner" element={<DashboardPage />} />

          {/* Customer Routes */}
          <Route path="/customer" element={<CustomerDashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;