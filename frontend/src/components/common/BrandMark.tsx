/**
 * The ProjectTracker brand mark ("time spark"): indigo gradient tile with a
 * white clock (timesheets) and a four-point spark (AI logging). Used in the
 * sidebar, auth pages and landing page; public/favicon.svg mirrors it.
 */
const BrandMark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 110 110" role="img" aria-label="ProjectTracker logo" style={{ display: 'block', flexShrink: 0 }}>
    <defs>
      <linearGradient id="pt-brand-lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4F46E5" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
    <rect width="110" height="110" rx="26" fill="url(#pt-brand-lg)" />
    <circle cx="49" cy="61" r="26" fill="none" stroke="#FFFFFF" strokeWidth="7.5" />
    <line x1="49" y1="61" x2="49" y2="48" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" />
    <line x1="49" y1="61" x2="59" y2="66" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" />
    <path d="M88 8 L93 20 L105 25 L93 30 L88 42 L83 30 L71 25 L83 20 Z" fill="#FFFFFF" />
  </svg>
);

export default BrandMark;
