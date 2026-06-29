interface Props {
  children: React.ReactNode
  className?: string
}

export function HindiText({ children, className }: Props) {
  return (
    <span
      className={className}
      style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', system-ui", lineHeight: 1.7 }}
    >
      {children}
    </span>
  )
}
