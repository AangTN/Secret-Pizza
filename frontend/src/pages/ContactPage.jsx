import React from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';

const ContactPage = () => {
  return (
    <section className="py-4">
      <Container>
        <Row className="g-4">
          <Col md={6}>
            <Card className="p-3">
              <h4 className="mb-3">Liên hệ với chúng tôi</h4>
              <Form onSubmit={(e) => e.preventDefault()}>
                <Form.Group className="mb-3">
                  <Form.Label>Họ tên</Form.Label>
                  <Form.Control placeholder="Nguyễn Văn A" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" placeholder="ban@vi.du" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nội dung</Form.Label>
                  <Form.Control as="textarea" rows={4} placeholder="Tin nhắn của bạn..." required />
                </Form.Group>
                <Button variant="danger" type="submit">Gửi</Button>
              </Form>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="p-3 h-100">
              <h4 className="mb-3">Thông tin</h4>
              <p className="mb-1">Hotline: 1900 1234</p>
              <p className="mb-1">Email: hello@secretpizza.vn</p>
              <p className="mb-0">Địa chỉ: 123 Đường Pizza, Quận 1, TP.HCM</p>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default ContactPage;
