/** Isometric studded block. */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 29 10 16 17 3 10Z" fill="var(--accent)" />
      <path d="M3 10 16 17V29L3 22Z" fill="var(--accent-deep)" />
      <path d="M29 10 16 17V29L29 22Z" fill="var(--accent-mid)" />
      <ellipse cx="11" cy="10" rx="2.6" ry="1.4" fill="var(--accent-mid)" />
      <ellipse cx="21" cy="10" rx="2.6" ry="1.4" fill="var(--accent-mid)" />
      <ellipse cx="16" cy="7.2" rx="2.6" ry="1.4" fill="var(--accent-mid)" />
      <ellipse cx="16" cy="12.8" rx="2.6" ry="1.4" fill="var(--accent-mid)" />
    </svg>
  );
}
