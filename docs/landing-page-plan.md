# Landing Page Implementation Plan

## Inputs & Constraints
- Use the lovable draft (https://github.com/chrhansen/shred-day-lovable/compare/964b2e9bdcbc1f20ef45d61481ea705857bbfa0a..afa44bfd2a32fb929ee47b7b01b8719ac1615fc3) as the primary visual reference and source for copy/assets.
- Keep existing auth flow intact; unauthenticated users should see the landing page at `/`, authenticated users continue to land on the app.
- Follow existing stack conventions (React + TS, Tailwind, shadcn/ui) and routing patterns in `client/src/App.tsx`.

## Plan
1) **Assess & stage assets**: Pull over any images/illustrations from the lovable draft, store under `client/public/landing/`, and note any needed Tailwind tokens (colors, spacing) to reproduce the design.
2) **Route & layout skeleton**: Introduce a public landing route (e.g., `LandingPage.tsx`) and update unauthenticated routing to render it at `/` while keeping `/auth` for sign-in/up. Ensure nav CTA buttons link into the existing auth flow.
3) **Build sections**: Implement the hero, pain-point grid, feature cards, stats highlight, and final CTA sections using reusable components where practical; ensure responsive behavior for mobile/tablet/desktop.
4) **Polish & accessibility**: Add hover/focus states, alt text for imagery, semantic headings, and ensure text contrast matches the design. Handle scroll/overflow gracefully for smaller screens.
5) **QA & verification**: Run `npm run lint` and `npm run build` in `client` to catch regressions; smoke-test unauthenticated flow locally (landing renders, CTAs navigate to auth, authenticated users still redirect to app).
6) **Git** Create a local branch and ope n a PR in Github with the changes
