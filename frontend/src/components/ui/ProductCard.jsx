import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { assetUrl, fetchVariants, fetchOptionPrices } from '../../services/api';
import styles from './ProductCard.module.css';

// Simple in-memory caches to avoid N network calls across many cards
let __variantsCache = null;
let __optionPricesCache = null;
let __loadingPromise = null;

async function ensureVariantDataLoaded() {
  if (__variantsCache && __optionPricesCache) return { variants: __variantsCache, optionPrices: __optionPricesCache };
  if (!__loadingPromise) {
    __loadingPromise = Promise.all([fetchVariants(), fetchOptionPrices()])
      .then(([variants, optionPrices]) => {
        __variantsCache = Array.isArray(variants) ? variants : [];
        __optionPricesCache = Array.isArray(optionPrices) ? optionPrices : [];
        return { variants: __variantsCache, optionPrices: __optionPricesCache };
      })
      .finally(() => {
        // Keep the promise for dedupe, but allow re-use of caches
      });
  }
  return __loadingPromise;
}

const ProductCard = ({ pizza, onView }) => {
  const { add } = useCart();
  // Initial price from embedded variants if present (older payloads), else null until loaded
  const [price, setPrice] = useState(() => {
    if (pizza?.BienTheMonAn?.length) {
      const prices = pizza.BienTheMonAn.map(v => Number(v.GiaBan));
      return Math.min(...prices);
    }
    return null;
  });
  const image = useMemo(() => {
    const h = pizza?.HinhAnh;
    if (!h) return '/placeholder.svg';
    const s = String(h);
    if (s.startsWith('http')) return s;
    if (s.startsWith('/')) return assetUrl(s);
    return assetUrl(`/images/AnhMonAn/${s}`);
  }, [pizza?.HinhAnh]);

  // Calculate discount price if promotion exists
  const promotion = pizza?.KhuyenMai;
  const discountedPrice = useMemo(() => {
    if (!promotion || !price) return null;
    const kmLoai = promotion.KMLoai?.toUpperCase();
    const kmGiaTri = Number(promotion.KMGiaTri || 0);
    if (kmLoai === 'PERCENT' || kmLoai === 'PHANTRAM') {
      return price - (price * kmGiaTri / 100);
    } else if (kmLoai === 'AMOUNT' || kmLoai === 'SOTIEN') {
      return Math.max(0, price - kmGiaTri);
    }
    return null;
  }, [promotion, price]);

  // Reconcile price using new variants API to ensure consistency with cart logic
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { variants } = await ensureVariantDataLoaded();
        if (!mounted) return;
        const list = (variants || []).filter(v => v?.MonAn?.MaMonAn === pizza?.MaMonAn);
        if (list.length > 0) {
          const minPrice = Math.min(...list.map(v => Number(v.GiaBan)));
          setPrice(minPrice);
        } else if (price == null) {
          // No variants found; default to 0 so UI shows fallback text
          setPrice(0);
        }
      } catch (e) {
        if (mounted && price == null) setPrice(0);
      }
    })();
    return () => { mounted = false; };
    // we intentionally exclude `price` from deps to avoid overriding a later update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pizza?.MaMonAn]);

  // Rating handling
  const avg = Number(pizza?.SoSaoTrungBinh || 0);
  const count = Number(pizza?.SoDanhGia || 0);
  const starIcons = useMemo(() => {
    if (!count) return 'Chưa có đánh giá';
    // Build 5 star display with half-star support (simple approximation)
    const full = Math.floor(avg);
    const half = avg - full >= 0.25 && avg - full < 0.75; // treat mid range as half
    const stars = [];
    for (let i = 0; i < full; i++) stars.push('★');
    if (half) stars.push('☆');
    while (stars.length < 5) stars.push('✩');
    return stars.join('');
  }, [avg, count]);

  return (
    <Link to={`/foods/${pizza.MaMonAn}`} className={styles.card} style={{ textDecoration: 'none' }}>
      <div className={`${styles.imageWrapper} ratio ratio-4x3`}>
        <img
          src={image}
          alt={pizza?.TenMonAn}
          loading="lazy"
          decoding="async"
          onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; } catch {} }}
        />
        <div className={styles.badgeLayer}>
          {promotion && (
            <div className={styles.promotionBadge}>
              {(promotion.KMLoai?.toUpperCase() === 'PERCENT' || promotion.KMLoai?.toUpperCase() === 'PHANTRAM') ? (
                <>-{promotion.KMGiaTri}%</>
              ) : (
                <>-{Number(promotion.KMGiaTri).toLocaleString()}<span style={{fontSize: '0.75em'}}>đ</span></>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.ratingStars}>
          {count ? (
            <>
              <span className={styles.stars}>{starIcons}</span>{' '}
              <span className="text-muted small">{avg.toFixed(1)} ({count})</span>
            </>
          ) : (
            <span className="text-muted small">Chưa có đánh giá</span>
          )}
        </div>
        <h5 className={styles.title}>{pizza?.TenMonAn}</h5>
        {typeof price === 'number' && price > 0 ? (
          <div className={styles.priceContainer}>
            {discountedPrice && discountedPrice < price ? (
              <>
                <div className={styles.originalPrice}>Từ {price.toLocaleString()} đ</div>
                <div className={styles.discountedPrice}>Từ {discountedPrice.toLocaleString()} đ</div>
              </>
            ) : (
              <div className={styles.price}>Từ {price.toLocaleString()} đ</div>
            )}
          </div>
        ) : (
          <div className="text-muted small">Xem chi tiết để biết giá</div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;