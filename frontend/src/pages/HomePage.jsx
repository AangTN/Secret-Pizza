import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Button, Spinner, Carousel, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { CupStraw, Gift, CupHot, Lightning, Star, Handbag, Cup, Basket } from 'react-bootstrap-icons';
import ProductCard from '../components/ui/ProductCard';
import CategoryPill from '../components/ui/CategoryPill';
import { assetUrl, fetchBestSellingFoods, fetchFeaturedFoods, fetchTypes, fetchBanners, fetchCombos, fetchGifts } from '../services/api';
import styles from './HomePage.module.css';

const HERO_MESSAGES = [
  { headline: 'Giao hàng hỏa tốc trong 60 phút', sub: 'Express Delivery Within 60 Minutes' },
  { headline: 'Fresh dough made every single morning', sub: 'Fresh Dough Made Daily' },
  { headline: 'Combo tiết kiệm đến 50.000đ', sub: 'Flash Deals & Family Combos' },
];

const HERO_STAT_CARDS = [
  { value: "60'", label: 'Giao nhanh', note: 'Đảm bảo nóng hổi', icon: <Lightning className={styles.statIcon} /> },
  { value: '50+', label: 'Món ăn', note: 'Menu phong phú', icon: <Basket className={styles.statIcon} /> },
  { value: '4.8', label: 'Điểm đánh giá', note: '5.000+ khách hàng', icon: <Star className={styles.statIcon} /> },
];

const CATEGORY_ICON_MAPPINGS = [
  { matcher: /(pizza|signature|dac biet)/i, Icon: Basket },
  { matcher: /(combo|family|party|set)/i, Icon: Gift },
  { matcher: /(coffee|ca phe|tea|tra|matcha)/i, Icon: CupHot },
  { matcher: /(drink|nuoc|soda|beverage|juice|smoothie)/i, Icon: CupStraw },
  { matcher: /(salad|healthy|rau)/i, Icon: Handbag },
  { matcher: /(pasta|mi|my|soi|spaghetti)/i, Icon: Handbag },
  { matcher: /(dessert|trang mieng|sweet|cake|banh)/i, Icon: Cup },
  { matcher: /(side|an kem|snack|wing|mon phu|phu)/i, Icon: Handbag },
];

const HERO_VIDEO_SRC = 'https://cdn.coverr.co/videos/coverr-slicing-pepperoni-pizza-9907/1080p.mp4';
const HERO_FALLBACK_POSTER = 'https://images.unsplash.com/photo-1548365328-5b640593c43b?auto=format&fit=crop&w=1600&q=80';

const normalizeTypeName = (name = '') => {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

const getTypeIcon = (name = '') => {
  const normalizedName = normalizeTypeName(name);
  const found = CATEGORY_ICON_MAPPINGS.find(mapping => mapping.matcher.test(normalizedName));
  const IconComponent = found?.Icon || Cup;
  return <IconComponent className={styles.categoryIcon} />;
};

let homeBootstrapRequest = null;

const fetchHomeBootstrapData = async () => {
  if (!homeBootstrapRequest) {
    homeBootstrapRequest = Promise.all([
      fetchBestSellingFoods(),
      fetchFeaturedFoods(),
      fetchTypes(),
      fetchBanners(),
      fetchCombos(),
      fetchGifts(),
    ])
      .then(([bestSelling, featured, typeData, bannerResponse, comboData, giftData]) => {
        const bannerData = Array.isArray(bannerResponse?.data)
          ? bannerResponse.data
          : (Array.isArray(bannerResponse) ? bannerResponse : []);

        return {
          bestSellingFoods: Array.isArray(bestSelling) ? bestSelling : [],
          featuredFoods: Array.isArray(featured) ? featured : [],
          types: Array.isArray(typeData) ? typeData : [],
          banners: bannerData,
          combos: Array.isArray(comboData) ? comboData.slice(0, 3) : [],
          gifts: Array.isArray(giftData) ? giftData : [],
        };
      })
      .finally(() => {
        homeBootstrapRequest = null;
      });
  }

  return homeBootstrapRequest;
};

const resolveBannerImage = (banner) => {
  const raw = banner?.AnhBanner;
  if (!raw) return HERO_FALLBACK_POSTER;
  const source = String(raw);
  if (source.startsWith('http')) return source;
  return assetUrl(source.startsWith('/') ? source : `/${source}`);
};

const resolveComboImage = (combo) => {
  const raw = combo?.HinhAnh;
  if (!raw) return '/placeholder.svg';
  const source = String(raw);
  if (source.startsWith('http')) return source;
  if (source.startsWith('/')) return assetUrl(source);
  return assetUrl(`/images/AnhCombo/${source}`);
};

const deriveComboPricing = (combo) => {
  if (!combo) return { sale: null, original: null, savings: null };
  const base = Number(combo?.GiaGoc ?? combo?.GiaTruoc ?? combo?.GiaBanGoc ?? 0);
  const sale = Number(combo?.Gia ?? combo?.GiaSau ?? combo?.GiaBan ?? combo?.GiaKhuyenMai ?? 0);
  const discount = Number(combo?.TienGiam ?? combo?.TietKiem ?? 0);
  if (sale && base && base > sale) {
    return { sale, original: base, savings: base - sale };
  }
  if (sale && discount) {
    return { sale, original: sale + discount, savings: discount };
  }
  if (base && discount && !sale) {
    const computedSale = Math.max(0, base - discount);
    return { sale: computedSale, original: base, savings: discount };
  }
  if (sale) {
    const syntheticOriginal = Math.round(sale * 1.15);
    return { sale, original: syntheticOriginal, savings: syntheticOriginal - sale };
  }
  if (base) {
    const syntheticSale = Math.round(base * 0.85);
    return { sale: syntheticSale, original: base, savings: base - syntheticSale };
  }
  return { sale: null, original: null, savings: null };
};

const HomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bestSellingFoods, setBestSellingFoods] = useState([]);
  const [featuredFoods, setFeaturedFoods] = useState([]);
  const [types, setTypes] = useState([]);
  const [banners, setBanners] = useState([]);
  const [combos, setCombos] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activeComboIndex, setActiveComboIndex] = useState(0);
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [showProjectNotice, setShowProjectNotice] = useState(false);

  const handleCloseProjectNotice = () => {
    setShowProjectNotice(false);
    try {
      sessionStorage.setItem('secret-pizza-project-notice-seen', '1');
    } catch {
      // Ignore storage failures (private mode, browser restrictions)
    }
  };

  useEffect(() => {
    try {
      const hasSeenNotice = sessionStorage.getItem('secret-pizza-project-notice-seen') === '1';
      if (!hasSeenNotice) {
        setShowProjectNotice(true);
      }
    } catch {
      setShowProjectNotice(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const homeData = await fetchHomeBootstrapData();
        if (!mounted) return;

        setBestSellingFoods(homeData.bestSellingFoods);
        setFeaturedFoods(homeData.featuredFoods);
        setTypes(homeData.types);
        setBanners(homeData.banners);
        setCombos(homeData.combos);
        setGifts(homeData.gifts);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Home bootstrap request failed:', error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % HERO_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveBannerIndex(0);
  }, [banners.length]);

  useEffect(() => {
    setActiveComboIndex(0);
  }, [combos.length]);

  // Derived/computed values
  const firstTypeId = useMemo(() => (types && types.length > 0 ? types[0].MaLoaiMonAn : null), [types]);
  const heroPoster = useMemo(() => {
    if (!banners.length) return HERO_FALLBACK_POSTER;
    const safeIndex = ((activeBannerIndex % banners.length) + banners.length) % banners.length;
    return resolveBannerImage(banners[safeIndex]);
  }, [activeBannerIndex, banners]);
  const heroMessage = HERO_MESSAGES[messageIndex];
  const heroCtaLink = firstTypeId ? `/menu?type=${firstTypeId}` : '/menu';
  const quickCategories = useMemo(() => types.slice(0, 8), [types]);
  const comboCarousel = useMemo(() => combos.slice(0, 5), [combos]);

  // Countdown timer based on active combo expiration
  useEffect(() => {
    const tick = () => {
      // Get the currently displayed combo's expiration date
      const currentCombo = comboCarousel[activeComboIndex];
      if (!currentCombo?.ThoiGianHetHan) {
        setCountdown({ hours: '00', minutes: '00', seconds: '00' });
        return;
      }
      
      // Parse expiration date as VN time (stored in DB without timezone conversion)
      const expDate = new Date(currentCombo.ThoiGianHetHan);
      const expTime = Date.UTC(
        expDate.getUTCFullYear(),
        expDate.getUTCMonth(),
        expDate.getUTCDate(),
        expDate.getUTCHours(),
        expDate.getUTCMinutes(),
        expDate.getUTCSeconds()
      );
      
      // Current time in VN (UTC+7)
      const now = new Date();
      const nowVN = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      );
      
      const diff = Math.max(0, expTime - nowVN);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // If more than 24 hours, show days + hours
      if (days > 0) {
        setCountdown({
          hours: String(days * 24 + hours).padStart(2, '0'),
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0'),
        });
      } else {
        setCountdown({
          hours: String(hours).padStart(2, '0'),
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0'),
        });
      }
    };
    
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeComboIndex, comboCarousel]);
  const countdownBlocks = useMemo(() => ([
    { label: 'Giờ', value: countdown.hours },
    { label: 'Phút', value: countdown.minutes },
    { label: 'Giây', value: countdown.seconds },
  ]), [countdown]);

  return (
    <>
      <Modal show={showProjectNotice} onHide={handleCloseProjectNotice} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thông báo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Đây là website đồ án môn học, không phải website thương mại thật. Mọi thông tin/đặt hàng trên hệ thống chỉ phục vụ mục đích học tập và demo.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleCloseProjectNotice}>
            Tôi đã hiểu
          </Button>
        </Modal.Footer>
      </Modal>

      <section className={styles.heroCinematic}>
        <div className={styles.heroMedia}>
          <video
            className={styles.heroVideo}
            src={HERO_VIDEO_SRC}
            poster={heroPoster}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className={styles.heroPoster} style={{ backgroundImage: `url(${heroPoster})` }} />
          <div className={styles.heroOverlayShade} />
        </div>
        <Container className={styles.heroInner}>
          <Row className="align-items-center gy-4">
            <Col lg={6}>
              <div className={styles.heroBadge}>Giao trong 60 phút • Handmade dough</div>
              <h1 className={styles.heroHeading}>Secret Pizza - Bùng lửa vị giác</h1>
              <div className={styles.heroMessageTrack}>
                <strong key={heroMessage.headline}>{heroMessage.headline}</strong>
                <span>{heroMessage.sub}</span>
              </div>
              <p className={styles.heroDescription}>
                Hơn 50+ món pizza, salad và combo chuẩn Ý. Lò nướng bật sẵn, tài xế chờ lệnh – chỉ cần bạn nhấn nút đặt món.
              </p>
              <div className={styles.heroActions}>
                <Button as={Link} to={heroCtaLink} size="lg" className={styles.primaryCta}>
                  Đặt ngay
                </Button>
                <Button href="#best-selling" variant="outline-light" size="lg" className={styles.secondaryCta}>
                  Best Seller
                </Button>
              </div>
            </Col>
            <Col lg={6}>
              <div className={styles.heroShowcase}>
                {banners.length > 0 ? (
                  <Carousel
                    interval={3500}
                    controls
                    indicators
                    fade
                    pause="hover"
                    touch
                    wrap
                    activeIndex={activeBannerIndex}
                    onSelect={(selectedIndex) => setActiveBannerIndex(selectedIndex)}
                  >
                    {banners.map((banner, idx) => {
                      const imageUrl = resolveBannerImage(banner);
                      return (
                        <Carousel.Item key={idx}>
                          <div
                            className={styles.bannerFrame}
                            onClick={() => banner.DuongDan && navigate(banner.DuongDan)}
                            style={{ cursor: banner.DuongDan ? 'pointer' : 'default' }}
                          >
                            <img
                              src={imageUrl}
                              alt={`Banner ${idx + 1}`}
                              loading="lazy"
                              onError={(e) => {
                                if (e?.currentTarget) {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/placeholder.svg';
                                }
                              }}
                            />
                          </div>
                        </Carousel.Item>
                      );
                    })}
                  </Carousel>
                ) : (
                  <div className={styles.bannerFrame}>
                    <img src={heroPoster} alt="Secret Pizza" loading="lazy" />
                  </div>
                )}
              </div>
            </Col>
          </Row>
          <div className={styles.heroStatsBar}>
            {HERO_STAT_CARDS.map(stat => (
              <div key={stat.label} className={styles.heroStatCard}>
                <div className={styles.heroStatIconWrapper}>{stat.icon}</div>
                <div className={styles.heroStatValue}>{stat.value}</div>
                <div className={styles.heroStatLabel}>{stat.label}</div>
                <p className={styles.heroStatNote}>{stat.note}</p>
              </div>
            ))}
          </div>
        </Container>
        <div className={styles.mobileFloatingCta}>
          <Button as={Link} to={heroCtaLink} size="lg">
            Đặt pizza ngay
          </Button>
        </div>
      </section>

      {gifts.length > 0 && (
        <section className={styles.giftSection}>
          <Container>
            <div className={styles.giftHeader}>
              <div className={styles.giftBadge}>
                <span className={styles.giftIcon}>🎁</span>
                <span>Quà tặng miễn phí</span>
              </div>
              <h2 className={styles.giftTitle}>Nhận ngẫu nhiên 1 món quà khi đơn hàng từ 300.000đ</h2>
              <p className={styles.giftSubtitle}>
                Cơ hội sở hữu các phiên bản Baby Pizza độc quyền với độ hiếm khác nhau
              </p>
            </div>
            
            <div className={styles.giftGrid}>
              {gifts.map((gift) => (
                <div key={gift.MaQuaTang} className={styles.giftCard}>
                  <div className={styles.giftImageWrapper}>
                    <div className={`${styles.giftRarityBadge} ${styles[`rarity${gift.CapDo}`]}`}>
                      {gift.CapDo}
                    </div>
                    <img
                      src={assetUrl(gift.HinhAnh)}
                      alt={gift.TenQuaTang}
                      className={styles.giftImage}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className={styles.giftChance}>
                      <span className={styles.giftChanceIcon}>✨</span>
                      <span className={styles.giftChanceText}>{gift.TyLeXuatHien}% tỷ lệ</span>
                    </div>
                  </div>
                  <div className={styles.giftContent}>
                    <h3 className={styles.giftName}>{gift.TenQuaTang}</h3>
                    <p className={styles.giftDescription}>{gift.MoTa}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.giftCta}>
              <Button as={Link} to="/menu" size="lg" className={styles.giftCtaButton}>
                Đặt ngay để nhận quà 🎁
              </Button>
            </div>
          </Container>
        </section>
      )}

      <section className={styles.categoryRail}>
        {comboCarousel.length > 0 && (
          <div className={styles.dealSection}>
            <Container>
              <Carousel
                className={styles.dealCarousel}
                activeIndex={activeComboIndex}
                onSelect={(selectedIndex) => setActiveComboIndex(selectedIndex)}
                interval={5000}
                controls
                indicators
                touch
                wrap
                pause="hover"
              >
                {comboCarousel.map(combo => {
                  const comboImage = resolveComboImage(combo);
                  const pricing = deriveComboPricing(combo);
                  return (
                    <Carousel.Item key={combo.MaCombo}>
                      <div className={styles.dealGrid}>
                        <div className={styles.dealMedia}>
                          <img src={comboImage} alt={combo.TenCombo} loading="lazy" />
                          {pricing.savings && (
                            <span className={styles.savingsBadge}>Tiết kiệm {pricing.savings.toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>
                        <div className={styles.dealContent}>
                          <h2>{combo.TenCombo}</h2>
                          <p className={styles.dealDescription}>{combo.MoTa || 'Set đầy đủ pizza, món kèm và thức uống cho một bữa tiệc ấm cúng.'}</p>
                          <div className={styles.dealPrices}>
                            {pricing.original && (
                              <span className={styles.originalPrice}>{pricing.original.toLocaleString('vi-VN')}đ</span>
                            )}
                            {pricing.sale && (
                              <span className={styles.salePrice}>{pricing.sale.toLocaleString('vi-VN')}đ</span>
                            )}
                          </div>
                          <div className={styles.countdownGrid}>
                            {countdownBlocks.map(block => (
                              <div key={`${combo.MaCombo}-${block.label}`} className={styles.countdownBox}>
                                <span>{block.value}</span>
                                <small>{block.label}</small>
                              </div>
                            ))}
                          </div>
                          <div className={styles.dealActions}>
                            <Button as={Link} to={`/combos/${combo.MaCombo}`} size="lg" variant="danger">
                              Đặt combo này
                            </Button>
                            <span className={styles.dealHint}>Kết thúc sau {countdown.hours}h {countdown.minutes}m</span>
                          </div>
                        </div>
                      </div>
                    </Carousel.Item>
                  );
                })}
              </Carousel>
            </Container>
          </div>
        )}

        <Container>
          <div className={styles.categoryHead}>
            <div>
              <p className={styles.categoryEyebrow}>Khởi động vị giác</p>
              <h3>Chọn nhanh theo nhóm món</h3>
            </div>
          </div>
          <div className={styles.categoryScroller}>
            {quickCategories.length > 0 ? (
              quickCategories.map(type => (
                <CategoryPill
                  key={type.MaLoaiMonAn}
                  label={type.TenLoaiMonAn}
                  icon={getTypeIcon(type.TenLoaiMonAn)}
                  to={`/menu?type=${type.MaLoaiMonAn}`}
                />
              ))
            ) : (
              <div className={styles.categoryPlaceholder}>Đang tải nhóm món...</div>
            )}
          </div>
        </Container>
      </section>

      {/* BEST SELLING FOODS - Món bán chạy nhất */}
      <section id="best-selling" className="py-4" style={{ background: '#fff' }}>
        <Container>
          <div className="mb-4">
            <h2 className={styles.sectionTitle}>Bán chạy nhất</h2>
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>Top món được đặt nhiều nhất - Đừng bỏ lỡ!</p>
          </div>
          {loading ? (
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Col key={i}>
                  <div className={styles.skeletonCard}>
                    <div className="ratio ratio-4x3 skeleton mb-3"></div>
                    <div className="skeleton" style={{ height: 16, width: '70%', borderRadius: 8 }}></div>
                    <div className="skeleton mt-2" style={{ height: 14, width: '50%', borderRadius: 8 }}></div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : bestSellingFoods.length > 0 ? (
            <>
              <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                {bestSellingFoods.map(item => (
                  <Col key={item.MaMonAn}>
                    <ProductCard pizza={item} />
                  </Col>
                ))}
              </Row>
              <div className="text-center mt-5">
                <Link to="/menu" className="btn btn-danger btn-lg px-5">
                  Xem tất cả món ăn →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Chưa có dữ liệu món bán chạy</p>
            </div>
          )}
        </Container>
      </section>

      {/* FEATURED FOODS - Món đề xuất (unified background) */}
      <section id="featured" className="py-4" style={{ background: '#fff' }}>
        <Container>
          <div className="mb-4">
            <h2 className={styles.sectionTitle}>Món đặc biệt</h2>
            <p className="text-muted" style={{ marginTop: '0.75rem' }}>Được chọn lọc kỹ càng bởi đầu bếp chuyên nghiệp</p>
          </div>
          {loading ? (
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Col key={i}>
                  <div className={styles.skeletonCard}>
                    <div className="ratio ratio-4x3 skeleton mb-3"></div>
                    <div className="skeleton" style={{ height: 16, width: '70%', borderRadius: 8 }}></div>
                    <div className="skeleton mt-2" style={{ height: 14, width: '50%', borderRadius: 8 }}></div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : featuredFoods.length > 0 ? (
            <>
              <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                {featuredFoods.map(item => (
                  <Col key={item.MaMonAn}>
                    <ProductCard pizza={item} />
                  </Col>
                ))}
              </Row>
              <div className="text-center mt-5">
                <Link to="/menu" className="btn btn-outline-danger btn-lg px-5">
                  Khám phá thực đơn →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Chưa có món được đề xuất</p>
            </div>
          )}
        </Container>
      </section>

      {/* STATS / CTA */}
      <section className="py-4" style={{ background: '#fff' }}>
        <Container>
          <div className="text-center mb-5">
            <h2 className={`${styles.sectionTitle} ${styles.noUnderline}`} style={{ fontSize: '2rem', fontWeight: '700' }}>
              Tại sao chọn Secret Pizza?
            </h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>
              Hơn cả một bữa ăn - Trải nghiệm pizza đích thực
            </p>
          </div>
          <Row className="g-4">
            <Col md={3} sm={6}>
              <div className="text-center p-4 h-100">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ff4d4f', marginBottom: '0.5rem' }}>60'</div>
                <div className="fw-semibold" style={{ color: '#6c757d' }}>Giao hàng nhanh</div>
                <p className="small text-muted mb-0 mt-2">Nóng hổi tận nhà</p>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="text-center p-4 h-100">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍕</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ff4d4f', marginBottom: '0.5rem' }}>50+</div>
                <div className="fw-semibold" style={{ color: '#6c757d' }}>Món ăn đa dạng</div>
                <p className="small text-muted mb-0 mt-2">Phong phú lựa chọn</p>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="text-center p-4 h-100">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ff4d4f', marginBottom: '0.5rem' }}>100%</div>
                <div className="fw-semibold" style={{ color: '#6c757d' }}>Nguyên liệu tươi</div>
                <p className="small text-muted mb-0 mt-2">Chất lượng đảm bảo</p>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="text-center p-4 h-100">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ff4d4f', marginBottom: '0.5rem' }}>24/7</div>
                <div className="fw-semibold" style={{ color: '#6c757d' }}>Đặt món online</div>
                <p className="small text-muted mb-0 mt-2">Tiện lợi mọi lúc</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default HomePage;
