import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true
};

function authReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false
      };
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false
      };
    default:
      return state;
  }
}

// Flag to prevent double auto-login in React StrictMode
let autoLoginAttempted = false;

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Auto-login ONCE on mount using auth token cookies
  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (autoLoginAttempted) {
      console.log('Auto-login skipped (already attempted)');
      return;
    }
    autoLoginAttempted = true;
    console.log('Auto-login starting...');
    
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        dispatch({ type: 'INIT', payload: res.data?.user || null });
      } catch (e) {
        console.error('Auto-login error:', e);
        dispatch({ type: 'INIT', payload: null });
      }
    })();
  }, []); // Empty dependency - only run ONCE on mount

  useEffect(() => {
    const handleAuthExpired = () => {
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Login function using backend-set cookies
  const login = async ({ email, matKhau }) => {
    try {
      const res = await api.post('/api/auth/login', { email, matKhau });
      const data = res.data;
      
      if (res.status === 200 && data && data.user) {
        dispatch({ type: 'LOGIN', payload: data.user });
        return { ok: true, user: data.user, message: data.message };
      }
      
      return { ok: false, message: data?.message || 'Đăng nhập thất bại' };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi đăng nhập';
      return { ok: false, message: msg };
    }
  };

  const loginWithGoogle = async ({ code }) => {
    try {
      const res = await api.post('/api/auth/google/login', { code });
      const data = res.data;

      if (res.status === 200 && data && data.user) {
        dispatch({ type: 'LOGIN', payload: data.user });
        return {
          ok: true,
          user: data.user,
          message: data.message,
          loginScenario: data.loginScenario,
          googleProfile: data.googleProfile,
        };
      }

      return { ok: false, message: data?.message || 'Đăng nhập Google thất bại' };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi đăng nhập Google';
      return { ok: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      localStorage.removeItem('cart');
      localStorage.removeItem('cart:compact');
    }
    dispatch({ type: 'LOGOUT' });
  };

  // Register via API. Payload should include at least { email, matKhau }
  const register = async ({ email, matKhau }) => {
    try {
      const res = await api.post('/api/auth/register', { email, matKhau });
      const data = res.data;

      if ((res.status === 200 || res.status === 201) && data) {
        return {
          ok: true,
          message: data.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.',
          ...data,
        };
      }

      return { ok: false, message: data?.message || 'Đăng ký thất bại' };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi đăng ký';
      return { ok: false, message: msg };
    }
  };

  const verifyEmail = async ({ token }) => {
    try {
      const res = await api.post('/api/auth/verify-email', { token });
      const data = res.data;

      if (res.status === 200 && data) {
        return {
          ok: true,
          message: data.message || 'Xác thực email thành công',
          ...data,
        };
      }

      return { ok: false, message: data?.message || 'Xác thực email thất bại' };
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi xác thực email';
      return { ok: false, message: msg };
    }
  };

  const updateUser = (updatedUserData) => {
    dispatch({ type: 'UPDATE_USER', payload: updatedUserData });
  };

  return (
    <AuthContext.Provider value={{ 
      user: state.user, 
      isAuthenticated: state.isAuthenticated,
      loading: state.loading,
      login,
      loginWithGoogle,
      logout,
      register,
      verifyEmail,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
