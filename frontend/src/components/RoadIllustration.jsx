// A small, purpose-built illustration (not a stock icon) used only in
// the "no predictions yet" empty state on the Dashboard -- a road
// receding toward the horizon, echoing the project's subject matter.
export default function RoadIllustration({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="120" height="120" rx="16" fill="#EFF1EC" />
      <path d="M0 82 L120 82 L120 120 L0 120 Z" fill="#DBDED6" />
      <path d="M46 82 L54 34 L66 34 L74 82 Z" fill="#3A3F49" />
      <path d="M59 40 L58 52" stroke="#E8EAEE" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58 62 L57 74" stroke="#E8EAEE" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="34" r="4.5" fill="#C4432E" />
      <circle cx="30" cy="96" r="5" fill="#B9760F" opacity="0.55" />
      <circle cx="90" cy="100" r="6" fill="#1E8E5A" opacity="0.5" />
    </svg>
  );
}
