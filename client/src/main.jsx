import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrandProvider } from './context/BrandContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrandProvider>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1e293b',
                    color: '#f1f5f9',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: { primary: '#10b981', secondary: '#f1f5f9' },
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
                  },
                }}
              />
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrandProvider>
    </BrowserRouter>
  </React.StrictMode>
);