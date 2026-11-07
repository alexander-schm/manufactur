/** Shared SVG filters and patterns. Render once near the app root. */
export function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="wobble" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="turbulence" baseFrequency="0.045" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <filter id="wobble-soft" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="1" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" />
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2" />
          <feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.07 0" />
        </filter>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2b2420" stroke-width="1.1" />
        </pattern>
        <pattern id="hatch-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#2b2420" stroke-width="0.8" opacity="0.5" />
        </pattern>
        <radialGradient id="glow">
          <stop offset="0%" stop-color="#fff0a8" stop-opacity="0.9" />
          <stop offset="60%" stop-color="#ffb238" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#ffb238" stop-opacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
