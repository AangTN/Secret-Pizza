import React, { useMemo } from 'react';
import styles from './SnowEffect.module.css';

const TOTAL_FLAKES = 50;

const SnowEffect = () => {
  const flakes = useMemo(() => (
    Array.from({ length: TOTAL_FLAKES }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 10,
      size: 6 + Math.random() * 10,
      drift: (Math.random() * 40) - 20,
      opacity: 0.4 + Math.random() * 0.6,
    }))
  ), []);

  return (
    <div className={styles.snow} aria-hidden="true">
      {flakes.map((flake) => (
        <span
          key={flake.id}
          className={styles.flake}
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            '--drift': `${flake.drift}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
};

export default SnowEffect;
