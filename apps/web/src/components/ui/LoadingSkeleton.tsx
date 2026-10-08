import React from 'react';

export const LoadingSkeleton: React.FC<{ height?: number | string; width?: number | string; style?: React.CSSProperties }> = ({
  height = 20,
  width = '100%',
  style = {},
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-hover) 50%, var(--bg-tertiary) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.5s infinite',
        ...style,
      }}
    />
  );
};
