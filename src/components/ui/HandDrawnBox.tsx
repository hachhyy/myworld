import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';

interface HandDrawnBoxProps {
  children: React.ReactNode;
  className?: string;
  fill?: string;
  stroke?: string;
  roughness?: number;
  onClick?: () => void;
}

/**
 * Contenedor con borde dibujado a mano con Rough.js para dar tacto de papel acuarela y tinta real
 */
export const HandDrawnBox: React.FC<HandDrawnBoxProps> = ({
  children,
  className = '',
  stroke = 'currentColor',
  roughness = 1.25,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    observer.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width < 10 || size.height < 10) return;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    const rc = rough.svg(svg);
    const node = rc.rectangle(3, 3, size.width - 6, size.height - 6, {
      roughness,
      bowing: 1.4,
      stroke,
      strokeWidth: 2.1,
    });
    svg.appendChild(node);
  }, [size.width, size.height, stroke, roughness]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative rounded-2xl ${className}`}
      style={{
        boxShadow: '4px 5px 0px var(--shadow-ink)',
      }}
    >
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible z-10 opacity-75"
        width={size.width}
        height={size.height}
      />
      <div className="relative z-0">{children}</div>
    </div>
  );
};
