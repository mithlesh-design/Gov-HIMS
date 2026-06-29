import * as React from "react"
import { cn } from "@/lib/utils"

// Configurable padding scale — the fixed `p-6` was a key inconsistency
// driver across pages. `md` keeps the previous look as the default.
const PAD = { none: "", sm: "p-4", md: "p-6", lg: "p-8" } as const
const PAD_TOP0 = { none: "", sm: "p-4 pt-0", md: "p-6 pt-0", lg: "p-8 pt-0" } as const
type Pad = keyof typeof PAD

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; elevated?: boolean }>(
  ({ className, interactive, elevated, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl bg-surface text-foreground-muted border border-border shadow-card transition-all duration-200",
        elevated && "shadow-md",
        interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-hover",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { padding?: Pad }>(
  ({ className, padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5", PAD[padding], className)}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("t-body text-foreground-lighter", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { padding?: Pad }>(
  ({ className, padding = "md", ...props }, ref) => (
    <div ref={ref} className={cn(PAD_TOP0[padding], className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { padding?: Pad }>(
  ({ className, padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center", PAD_TOP0[padding], className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
