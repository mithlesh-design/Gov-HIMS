import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/utils"

/**
 * Human-centred photography wrapper. Used ONLY on landing + patient-facing
 * pages — never in dense clinical worklists (perf + focus).
 *
 * Enforces accessibility (required `alt`) and the performance budget:
 * next/image with responsive `sizes`, lazy-loading below the fold, and a
 * lightweight blur placeholder so layout never jumps. Source is Unsplash
 * (configured in next.config.ts → images.remotePatterns).
 */
export interface PhotoProps extends Omit<ImageProps, "placeholder"> {
  /** Required — describe the image for screen readers. Use "" only if purely decorative. */
  alt: string
  /** Rounded corners on the wrapper. */
  rounded?: boolean
  wrapperClassName?: string
}

// A neutral 1px blur data URL — cheap, no extra request, prevents CLS.
const BLUR =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#EAECF2"/></svg>`
  ).toString("base64")

export function Photo({ alt, rounded = true, wrapperClassName, className, fill, sizes, ...props }: PhotoProps) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-sunken", rounded && "rounded-2xl", wrapperClassName)}>
      <Image
        alt={alt}
        placeholder="blur"
        blurDataURL={BLUR}
        sizes={sizes ?? (fill ? "(max-width: 768px) 100vw, 50vw" : undefined)}
        fill={fill}
        className={cn("object-cover", className)}
        {...props}
      />
    </div>
  )
}
