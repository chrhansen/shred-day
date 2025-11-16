# Days List Highlight Plan

1. Review lovable diff to understand desired anchor behavior plus highlight styling, and audit current routing/query params in `client/src/pages/DaysListPage.tsx` and `client/src/components/SkiDayItem.tsx` for integration points.
2. Update routing/state so edits/creates append the edited day id as a hash (e.g. `/days?season=0#day_123`) when redirecting back to the list, and teach `DaysListPage` to read that hash/search param, scroll the matching list item into view on mount, and clear the marker once handled.
3. Adjust `SkiDayItem` to expose an anchor-compatible wrapper and accept a `isHighlighted` prop; add Tailwind classes for the active background/left border as shown in the screenshot.
4. Ensure focus/highlight resets after a timeout or when navigation changes, and cover the new behavior with a lightweight test plan (manual or automated depending on feasibility).
5. See example of temporary highlight here: docs/revelstoke-temporary-highlighted.png (revelstoke-day)
