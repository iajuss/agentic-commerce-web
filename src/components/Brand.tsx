export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Agentic Commerce">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      {!compact && <span className="brand-name">agentic</span>}
    </div>
  )
}
