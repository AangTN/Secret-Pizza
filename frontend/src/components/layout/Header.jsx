import React from 'react';
import { Navbar, Nav, Container, Badge, Dropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { Cart3, PersonCircle, HouseDoor, CardList, InfoCircle, GeoAlt, Box } from 'react-bootstrap-icons';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

const Header = () => {
  const { totalQuantity } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.sticky}>
      <Navbar expand="lg" className={styles.navBar}>
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand className={styles.brand}>
              <img src="/logo.png" alt="logo" /> 
              <span>Secret Pizza</span>
            </Navbar.Brand>
          </LinkContainer>

          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto ms-lg-3">
              <LinkContainer to="/">
                <Nav.Link className={styles.navLink}>
                  <HouseDoor size={18} className="me-1" />
                  <span>Trang chủ</span>
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/menu">
                <Nav.Link className={styles.navLink}>
                  <CardList size={18} className="me-1" />
                  <span>Menu</span>
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/about">
                <Nav.Link className={styles.navLink}>
                  <InfoCircle size={18} className="me-1" />
                  <span>Về chúng tôi</span>
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/track-order">
                <Nav.Link className={styles.navLink}>
                  <GeoAlt size={18} className="me-1" />
                  <span>Đơn hàng</span>
                </Nav.Link>
              </LinkContainer>
            </Nav>
            <Nav className="d-flex align-items-center gap-2">
              {isAuthenticated ? (
                <Dropdown align="end" className={styles.userDropdown}>
                  <Dropdown.Toggle 
                    variant="link" 
                    className="text-decoration-none"
                  >
                    <PersonCircle size={22} className="me-1" />
                    <span>{user?.hoTen || user?.email}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <LinkContainer to="/profile/edit">
                      <Dropdown.Item>
                        Chỉnh sửa thông tin
                      </Dropdown.Item>
                    </LinkContainer>
                    <Dropdown.Item onClick={handleLogout}>
                      Đăng xuất
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <LinkContainer to="/login">
                  <Nav.Link className={styles.loginButton}>
                    <PersonCircle size={22} className="me-1" />
                    <span>Đăng nhập</span>
                  </Nav.Link>
                </LinkContainer>
              )}
              
              <LinkContainer to="/cart">
                <Nav.Link className={styles.cartIcon}>
                  <Cart3 size={20} />
                  <span className="ms-2">Giỏ hàng</span>
                  {totalQuantity > 0 && (
                    <Badge pill className={styles.cartBadge}>{totalQuantity}</Badge>
                  )}
                </Nav.Link>
              </LinkContainer>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
};

export default Header;
