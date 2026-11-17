import React from 'react';

interface HandDrawnBoxProps {
  children: React.ReactNode;
  className?: string;
  fill?: string;
  stroke?: string;
  roughness?: number;
  onClick?: () => void;
}

/**
 * Contenedor limpio y nativo (sin trazos SVG superpuestos de Rough.js)
 */
export const HandDrawnBox: React.FC<HandDrawnBoxProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5 ${className}`}
    >
      {children}
    </div>
  );
};
