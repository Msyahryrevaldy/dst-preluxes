export function PreluxesWordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-serif lowercase tracking-[-0.025em] font-normal text-[#30302E] select-none whitespace-nowrap shrink-0 relative leading-none ${className}`}
      aria-label="preluxes"
    >
      <span>prelu</span>
      <span className="relative inline-block">
        x
        <svg
          aria-hidden="true"
          viewBox="0 0 100 32"
          className="pointer-events-none absolute -top-[0.26em] left-[0.38em] w-[1.82em] h-[0.58em] overflow-visible text-[#30302E]"
          fill="currentColor"
        >
          <path d="M 2 30 C 20 2, 62 -3, 97 16 C 65 2, 24 7, 5 30 Z" />
        </svg>
      </span>
      <span>es</span>
    </span>
  );
}
