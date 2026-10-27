// Logo do agentic em SVG inline. Traço e wordmark usam currentColor;
// o ponto usa --brand-dot (padrão: --lime-deep, que vira mint no modo escuro).
// No menu lateral, defina `.sidebar { --brand-dot: var(--mint); color: var(--on-dark); }`.

type BrandProps = {
  compact?: boolean
  className?: string
}

function Lens() {
  return (
    <g transform="translate(-0.8 0.5) rotate(-8 16 16)">
      <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <circle cx="13.5" cy="13.5" r="9" />
        <path d="M23.2 23.2L27.9 27.9" />
      </g>
      <circle cx="13.5" cy="13.5" r="3.1" fill="var(--brand-dot, var(--lime-deep))" />
    </g>
  )
}

export function Brand({ compact = false, className }: BrandProps) {
  const classes = ['brand', className].filter(Boolean).join(' ')

  if (compact) {
    return (
      <svg className={classes} viewBox="0 0 32 32" role="img" aria-label="agentic">
        <Lens />
      </svg>
    )
  }

  return (
    <svg className={classes} viewBox="0 0 161 36" role="img" aria-label="agentic">
      <g transform="translate(0 2)">
        <Lens />
      </g>
      <g transform="translate(41 0)">
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8.6" cy="17" r="7" />
          <path d="M15.6 10V24" />
          <circle cx="29.8" cy="17" r="7" />
          <path d="M36.8 10V26A6 6 0 0 1 30.8 32H28.6" />
          <path d="M44 17H58A7 7 0 1 0 55.95 21.95" />
          <path d="M65.2 24V10M65.2 16A6 6 0 0 1 77.2 16V24" />
          <path d="M85.8 4.6V19A5 5 0 0 0 90.8 24H92M82.6 10H91.6" />
          <path d="M98.2 10V24" />
          <path d="M116.95 12.05A7 7 0 1 0 116.95 21.95" />
        </g>
        <circle cx="98.2" cy="4.2" r="2.3" fill="var(--brand-dot, var(--lime-deep))" />
      </g>
    </svg>
  )
}
