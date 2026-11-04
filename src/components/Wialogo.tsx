import React from 'react';

// Logo da WIADUPLA. A cor vem do texto (classes text-white, text-blue-600...)
// e o tamanho vem da largura (w-8, w-10...).
export const WiaLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="2 7 96 60"
    className={className}
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinejoin="round"
    role="img"
    aria-label="WIADUPLA"
  >
    <polygon points="32,10 68,10 79,21 68,32 50,14 32,32 21,21" />
    <polygon points="15,27 26,38 50,61 74,38 85,27 95,37 68,64 32,64 5,37" />
  </svg>
);