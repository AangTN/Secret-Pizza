import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();
  const { verifyEmail } = useAuth();

  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [message, setMessage] = useState('');
  const [hasAttempted, setHasAttempted] = useState(false);

  const runVerification = useCallback(async () => {
    if (!token) {
      setStatus('missing');
      setMessage('Liên kết xác thực không hợp lệ hoặc thiếu token.');
      return;
    }

    setStatus('verifying');
    setMessage('');

    const result = await verifyEmail({ token });
    if (result.ok) {
      setStatus('success');
      setMessage(result.message || 'Xác thực email thành công. Bạn có thể đăng nhập.');
      return;
    }

    setStatus('error');
    setMessage(result.message || 'Xác thực email thất bại. Vui lòng thử lại.');
  }, [token, verifyEmail]);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('Liên kết xác thực không hợp lệ hoặc thiếu token.');
      return;
    }

    if (hasAttempted) {
      return;
    }

    setHasAttempted(true);
    runVerification();
  }, [token, hasAttempted, runVerification]);

  return (
    <div className="py-5">
      <Container style={{ maxWidth: 560 }}>
        <Card className="shadow-sm border-0">
          <Card.Body className="p-4 p-md-5 text-center">
            <h2 className="mb-3">Xac thuc email</h2>

            {status === 'verifying' && (
              <div className="d-flex flex-column align-items-center gap-2">
                <Spinner animation="border" role="status" />
                <div>Dang xac thuc, vui long cho...</div>
              </div>
            )}

            {status === 'success' && <Alert variant="success">{message}</Alert>}
            {status === 'error' && <Alert variant="danger">{message}</Alert>}
            {status === 'missing' && <Alert variant="warning">{message}</Alert>}

            <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
              {status === 'error' && token && (
                <Button variant="outline-primary" onClick={runVerification}>
                  Thu lai
                </Button>
              )}

              <Button as={Link} to="/login" variant={status === 'success' ? 'success' : 'primary'}>
                Den trang dang nhap
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default EmailVerificationPage;
