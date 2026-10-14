---
read_when: Reviewing changes to the iPhone beta
---

# Mobile changelog

## 1.0.2 — beta, 2026-10-14

- Upload selected photos and avatars using SDK 57's supported file bodies; preserve JPEG, HEIC and PNG bytes through multipart encoding.
- Load day counts for every season when opening the picker, with loading and retry states for unavailable counts.
- Keep the day editor's header and save controls within its full-screen modal's safe area on notched iPhones.
- Sign into the same journal automatically when Apple or Google verifies the existing account's email. Manual connection is optional for providers with a different email. Explain known provider failures without replacing every rejection with a connection warning.
- Require email confirmation before password access. Email signup sends a link for confirmation and password setup; pending accounts get no session. Existing unconfirmed password users can request a link from Log In. Google and Apple continue without an extra email step.

## 1.0.1 — beta, 2026-10-14

- Browse a month-grouped journal or calendar with a shared season picker and device week order. Seven calendar columns fit the measured screen width; larger text can scroll horizontally. Journal month navigation and date selection stay within the queried season, including midmonth cutoffs; bounds follow the API's UTC season reference. Open a day, long press for actions, or log the selected date.
- View photo-led day details, retry failed images and open a full-screen gallery with zoom, paging and swipe dismissal. Public pages show a read-only day.
- Log and edit days through a keyboard-aware modal, resort/item sheets and photo upload states. Unsaved changes ask before dismissal; successful mutations complete while lists refresh in the background.
- Explore tappable season charts and resort markers; refreshes reconcile removed chart selections. Manage skis/tags, profile and sign-in methods through grouped settings.
- Control sharing explicitly, copy/share/preview a confirmed link, revoke access and hide cached content after a public 404. Sharing subtitles stay within the sheet's scroll bounds. Network failures avoid promising that nothing changed.
- Reauthenticate for account deletion, then clear this iPhone's credentials, account queries and image caches. Journal/public pages are removed; server photo purges finish asynchronously.

Existing API limits remain: used tags cannot be deleted, tag rename is unavailable, reenabling sharing reuses its URL, and provider status reflects methods confirmed on this iPhone. See [README.md](README.md#existing-api-limits).

For contributors: SDK 57 patches, Router-owned navigation helpers, reusable native UI/theme and behavior regressions. The native/provider/gesture/device checks in [RELEASE.md](RELEASE.md#device-and-beta-gate) remain part of internal beta validation before App Store release; this entry does not certify them complete.
