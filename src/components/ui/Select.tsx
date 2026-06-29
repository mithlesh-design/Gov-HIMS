import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * Native <select> with a consistent, custom chevron.
 *
 * The chevron is drawn by the `.ui-select` background image (globals.css),
 * anchored to the right edge with breathing room. We enforce `pr-9` last in
 * the class list so a call site's own horizontal padding (e.g. `px-2`) can
 * never shrink the space reserved for the arrow — fixing the long-standing
 * "arrow crammed against the right edge" inconsistency app-wide.
 *
 * Width, height, colors, borders and text sizing are all inherited from the
 * call site's `className`, so this is a drop-in replacement for `<select>`.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn("ui-select cursor-pointer", className, "pr-9")}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
