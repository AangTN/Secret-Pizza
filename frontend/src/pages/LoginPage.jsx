import React, { useEffect, useRef, useState } from 'react';
import { Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginPage.module.css';

const GOOGLE_OAUTH_CLIENT_ID =
  import.meta.env.CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.VITE_CLIENT_ID ||
  '';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPES = 'openid email profile';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleCodeClientRef = useRef(null);
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (!GOOGLE_OAUTH_CLIENT_ID) {
      setGoogleReady(false);
      return undefined;
    }

    let isMounted = true;

    const initGoogleCodeClient = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2 || !isMounted) {
        return;
      }

      googleCodeClientRef.current = oauth2.initCodeClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        ux_mode: 'popup',
        redirect_uri: 'postmessage',
        callback: async (response) => {
          if (!isMounted) {
            return;
          }

          if (!response?.code) {
            setGoogleLoading(false);
            setError('Không nhận được mã xác thực từ Google.');
            return;
          }

          setError('');
          setSuccess('');

          try {
            const resp = await loginWithGoogle({ code: response.code });
            if (resp.ok) {
              navigate(from, { replace: true });
              return;
            }
            setError(resp.message || 'Đăng nhập Google thất bại');
          } catch {
            setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
          } finally {
            if (isMounted) {
              setGoogleLoading(false);
            }
          }
        },
        error_callback: (googleError) => {
          if (!isMounted) {
            return;
          }

          setGoogleLoading(false);

          if (googleError?.type === 'popup_closed') {
            setError('Bạn đã đóng cửa sổ chọn tài khoản Google.');
            return;
          }

          setError('Không thể mở đăng nhập Google. Vui lòng thử lại.');
        },
      });

      setGoogleReady(true);
    };

    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (window.google?.accounts?.oauth2) {
      initGoogleCodeClient();
    } else if (existingScript) {
      existingScript.addEventListener('load', initGoogleCodeClient);
    } else {
      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = initGoogleCodeClient;
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (existingScript) {
        existingScript.removeEventListener('load', initGoogleCodeClient);
      }
    };
  }, [from, loginWithGoogle, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const resp = await login({ email: formData.email, matKhau: formData.password });
      if (resp.ok) {
        navigate(from, { replace: true });
      } else {
        setError(resp.message || 'Đăng nhập thất bại');
      }
    } catch {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    // Client-side validation
    const email = (formData.email || '').trim();
    const password = String(formData.password || '');
    const confirmPassword = String(formData.confirmPassword || '');

    function isValidEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    if (!isValidEmail(email)) {
      setError('Định dạng email không hợp lệ.');
      setLoading(false);
      return;
    }

    if (password.length <= 6) {
      setError('Mật khẩu phải nhiều hơn 6 ký tự.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      setLoading(false);
      return;
    }

    try {
      const resp = await register({
        email,
        matKhau: password,
      });
      if (resp.ok) {
        // Registration now requires email verification before login.
        setSuccess(resp.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.');
        setActiveTab('login');
        setFormData(prev => ({ ...prev, email, password: '', confirmPassword: '' }));
      } else {
        setError(resp.message || 'Đăng ký thất bại');
      }
    } catch {
      setError('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    setSuccess('');

    if (!GOOGLE_OAUTH_CLIENT_ID) {
      setError('Thiếu cấu hình CLIENT_ID (hoặc VITE_GOOGLE_CLIENT_ID) cho đăng nhập Google.');
      return;
    }

    if (!googleCodeClientRef.current || !googleReady) {
      setError('Đăng nhập Google chưa sẵn sàng. Vui lòng thử lại sau ít giây.');
      return;
    }

    try {
      setGoogleLoading(true);
      googleCodeClientRef.current.requestCode();
    } catch {
      setGoogleLoading(false);
      setError('Không thể mở cửa sổ đăng nhập Google. Vui lòng thử lại.');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.illustrationSide}>
            <div className={styles.illustration}>🎄</div>
            <h2 className={styles.welcomeText}>Chào mừng về nhà!</h2>
            <p className={styles.welcomeSubtext}>
              Mùa Giáng sinh thật ấm áp hơn khi có bạn đồng hành
            </p>
          </div>
          <div className={styles.formSide}>
            <h3 className={styles.formTitle}>🍕 SECRET PIZZA</h3>
            
            {error && <Alert variant="danger" className={styles.alert}>{error}</Alert>}
            {success && <Alert variant="success" className={styles.alert}>{success}</Alert>}

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className={`${styles.tabs} mb-4`}
              justify
            >
              <Tab eventKey="login" title="Đăng nhập">
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      className={styles.formControl}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Nhập email"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Mật khẩu</Form.Label>
                    <Form.Control
                      className={styles.formControl}
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Nhập mật khẩu"
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </Button>

                  <div className={styles.oauthDivider}><span>hoặc</span></div>

                  <Button
                    type="button"
                    className={styles.googleButton}
                    onClick={handleGoogleLogin}
                    disabled={loading || googleLoading || !googleReady}
                  >
                    <span className={styles.googleIcon} aria-hidden="true">G</span>
                    {googleLoading ? 'Đang xác thực với Google...' : 'Đăng nhập bằng Google'}
                  </Button>

                  {!GOOGLE_OAUTH_CLIENT_ID && (
                    <div className={styles.oauthHint}>Thiếu cấu hình CLIENT_ID hoặc VITE_GOOGLE_CLIENT_ID.</div>
                  )}

                      <div className="text-center">
                        <Button
                          variant="link"
                          onClick={() => navigate(from, { replace: true })}
                          style={{ textDecoration: 'none' }}
                        >
                          Tiếp tục mua hàng không cần đăng nhập
                        </Button>
                      </div>
                    </Form>
                  </Tab>

              <Tab eventKey="register" title="Đăng ký">
                <Form onSubmit={handleRegister}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      className={styles.formControl}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Nhập email"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Mật khẩu</Form.Label>
                    <Form.Control
                      className={styles.formControl}
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Nhập mật khẩu"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Nhập lại mật khẩu</Form.Label>
                    <Form.Control
                      className={styles.formControl}
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Nhập lại mật khẩu"
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                  </Button>

                  <div className="text-center mt-3">
                    <Button
                      variant="link"
                      onClick={() => navigate(from, { replace: true })}
                      style={{ textDecoration: 'none', color: '#165b33', fontWeight: 600 }}
                    >
                      Tiếp tục mua hàng không cần đăng nhập
                    </Button>
                  </div>
                </Form>
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
