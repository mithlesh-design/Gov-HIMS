import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── Design-system guardrail (Stripe-inspired tokens, see /DESIGN.md) ──────────
// The legacy blue palette (#1976E6 ramp) was migrated to indigo tokens
// (`var(--color-primary)` / `bg-primary`). These rules error if any of those
// literal blues reappear, so the codebase can never regress to the old palette.
// Colour belongs in src/app/globals.css `@theme`, not in component literals.
const LEGACY_BLUE = "1976[eE]6|0048[bB]5|338[aA][fF]0|005[fF][dD]1";
const BLUE_MSG =
  "Legacy blue palette is retired. Use design tokens instead: `bg-primary` / `text-primary` / `var(--color-primary)` (see /DESIGN.md).";
const noLegacyBlue = {
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: `Literal[value=/#(${LEGACY_BLUE})/]`, message: BLUE_MSG },
      { selector: `TemplateElement[value.raw=/#(${LEGACY_BLUE})/]`, message: BLUE_MSG },
      { selector: "Literal[value=/rgba\\(\\s*25\\s*,\\s*118\\s*,\\s*230/]", message: BLUE_MSG },
      { selector: "TemplateElement[value.raw=/rgba\\(\\s*25\\s*,\\s*118\\s*,\\s*230/]", message: BLUE_MSG },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Lock in the Stripe-inspired token migration across app + components.
  { files: ["src/**/*.{ts,tsx}"], ...noLegacyBlue },
]);

export default eslintConfig;
