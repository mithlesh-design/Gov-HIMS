import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Human-centred photography is sourced from Unsplash's free library and
    // served through next/image (responsive sizes + lazy-load + blur). Photos
    // are used only on landing + patient-facing pages, never clinical worklists.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
