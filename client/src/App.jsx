// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

// Import only the pages that actually exist
import AdminLayout from './components/AdminLayout';
import BrandingPage from './pages/admin/BrandingPage';
import LegalPagesPage from './pages/admin/LegalPagesPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';

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
        console.log('Company settings not yet configured');
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Routes>
          {/* Redirect root to admin branding */}
          <Route path="/" element={<Navigate to="/admin/branding" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/branding" replace />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="legal" element={<LegalPagesPage />} />
            <Route path="company" element={<CompanySettingsPage />} />
          </Route>

          {/* Catch all - redirect to admin */}
          <Route path="*" element={<Navigate to="/admin/branding" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;