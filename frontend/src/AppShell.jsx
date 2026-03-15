import React from 'react';
import App from './App';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

function AppShell({ Router, routerProps = {} }) {
  return (
    <Router {...routerProps}>
      <AdminAuthProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </AdminAuthProvider>
    </Router>
  );
}

export default AppShell;