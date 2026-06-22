# Changed

- Date: 2026-06-23
- Version: v0.1.0
- Summary: Added the canvas and admin surfaces, tightened realtime usage tracking, and cleaned up save/share flows plus the main dashboard UI.

## What changed

- Added a new `/admin` area for platform analytics, including users, activity, realtime session usage, and monthly spend visibility.
- Added and reorganized canvas routes, including public/shared canvas handling and a cleaner `/canvas` flow.
- Added server routes for canvas persistence and OpenAI realtime usage tracking.
- Moved OpenAI realtime pricing into versioned server-side logic instead of environment-based price constants.
- Added a canvas presentation flow with start-class / voice-director style controls and shared preview behavior.
- Added canvas themes, typography controls, frame/presentation updates, and better block editing support.
- Added project session cards and edit dialogs so project pages can show sessions more cleanly.
- Cleaned up the dashboard, sidebar, and canvas layout so the UI is more consistent across the app.
- Reworked admin styling to stay on-brand and use the existing design system instead of introducing a new look.

## Bug fixes

- Fixed canvas saves so theme and document updates persist reliably.
- Fixed share-link creation so it runs through the authenticated server route.
- Fixed the canvas creation flow that was failing on missing or null share slug data.
- Reduced layout issues in the canvas and presentation views by tightening the page structure and scroll behavior.
- Fixed the realtime usage cost path so usage records can be priced without relying on env vars at runtime.

## Notes

- Build and TypeScript checks are currently passing locally.
- The remaining lint output is warning-only and does not block deployment.
