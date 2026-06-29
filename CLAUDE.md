@AGENTS.md

## Project

**Name:** Agentix HIMS
**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Purpose:** Hospital Information Management System for Uttar Pradesh health infrastructure — includes patient management, lab orders, OPD/IPD, AI health companion, district/CMO cockpits.

## Structure

- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — Shared UI components
- `src/services/` — API and external service integrations
- `src/store/` — State management
- `src/types/` — TypeScript type definitions
- `src/ai-services/` — AI/LLM integrations
- `src/rules-engine/` — Business rules
- `specs/` — Feature specs and requirements
- `context/` — Agent context documents

## Branch Discipline

- Work on feature branches, never commit directly to `main`
- Branch naming: `feat/<name>`, `fix/<name>`, `chore/<name>`
- PRs required to merge to `main`

## Guardrails

- Read `node_modules/next/dist/docs/` before writing any Next.js code (see AGENTS.md)
- TypeScript always — no `any` unless truly unavoidable
- Functional components only, no class components
- `StyleSheet.create()` for React Native styles; for Next.js use Tailwind classes
- No inline style objects for reused styles
- Do not add error handling for scenarios that cannot happen
- Validate only at system boundaries (user input, external APIs)
- Default: no comments unless the WHY is non-obvious
