/* Shared SVG filters: a deckle (torn watercolor-paper) edge for card
 * backgrounds. Applied to a background-only pseudo-element so the painted
 * edge roughens while the text above stays crisp. Rendered once at the app root. */
export function Filters() {
  return (
    <svg className="filters" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id="deckle" x="-8%" y="-14%" width="116%" height="128%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.015 0.019" numOctaves="3" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="deckle-lg" x="-6%" y="-8%" width="112%" height="116%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.014" numOctaves="3" seed="9" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="deckle-sm" x="-10%" y="-18%" width="120%" height="136%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.022 0.03" numOctaves="3" seed="2" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
