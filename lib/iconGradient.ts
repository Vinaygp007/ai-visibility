// Matches the <linearGradient id="icon-blue-gradient"> defined once in
// app/layout.tsx. Pass as the `color` prop on any lucide-react icon (it maps
// to `stroke`), and pair with `style={{ color: ICON_GRADIENT_FALLBACK }}` so
// any currentColor fill details (e.g. Tag's dot) pick up a matching solid
// blue instead of resolving to inherited text color.
export const ICON_GRADIENT = "url(#icon-blue-gradient)";
export const ICON_GRADIENT_FALLBACK = "#2563eb";
