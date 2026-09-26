/**
 * Brand mark: three delay-line rings, the outer one carrying a pluck,
 * the same picture the landing page animates. Paths are precomputed.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
      <path
        d="M16 2.5c3.2 0 5.6.9 7.6 2.3 2.4 1.6 3.3 3.9 4.4 5.6 1 1.6 1.5 3.5 1.5 5.6 0 3.7-1.5 7.1-4 9.5-2.4 2.4-5.8 4-9.5 4s-7.1-1.5-9.5-4a13.4 13.4 0 0 1-4-9.5c0-3.7 1.5-7.1 4-9.5C9 3.9 12.3 2.5 16 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
