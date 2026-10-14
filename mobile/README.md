---
read_when: Developing or configuring the Shred.Day Expo app
---

# Shred.Day for iPhone

Independent npm project using Expo SDK 57, React Native 0.86, TypeScript, Expo Router and TanStack Query. Uses the existing Rails accounts, data and API. Native screens cover login/signup, season lists/calendars, day editing, photos, stats/maps, equipment, tags, profile settings, sharing and account deletion.

## Native UI in 1.0.1

- Days and Season share a season picker. The journal groups days by month; calendar mode follows the device's first weekday and stays within the selected season, including custom midmonth cutoffs. Change the header's season to browse another season. Select an available date to open logging with that date; the editor can choose any date. Long press a day for sharing, editing or deletion.
- Day details lead with a paged gallery. The full-screen viewer opens at the tapped photo and supports pinch/double-tap zoom, thumbnails and swipe-down dismissal. Failed images can be retried individually.
- Logging uses a full-screen editor with resort and ski/tag sheets, a keyboard-aware Save button, per-photo upload states and an unsaved-change confirmation. Failed or pending uploads block Save; confirmed saves complete before background refreshes.
- Season cards provide tappable month bars, tag selection, equipment counts and native resort markers. A map fallback keeps resort counts available. Settings contains profile, sign-in methods, gear and account deletion.
- Sharing requires an explicit public-link toggle before Copy or the system share sheet. Public day pages remain read-only for signed-in and signed-out visitors.

This is a beta UI update. See [the changelog](CHANGELOG.md) and [the device gate](RELEASE.md#device-and-beta-gate); source/unit checks do not establish native gesture, keyboard or provider behavior.

## Run locally

Use asdf Node 24.21.0. CocoaPods uses asdf Ruby 3.4.2 on Christian's Mac.

```sh
cd mobile
npm ci
cp .env.example .env.local
npm run ios
```

Start the Rails API separately after installing gems and running `bin/rails db:migrate`. Set `EXPO_PUBLIC_API_BASE_URL` in `.env.local`. Simulator default: `http://127.0.0.1:3000`. For a physical iPhone, use the Mac's reachable LAN address and run Rails with `-b 0.0.0.0`, or use an HTTPS development endpoint. Set `APP_ENV=development` for local networking; production retains normal ATS protections.

Google Sign-In requires a development build; Expo Go does not include its native module. `npm start` runs Metro after that build exists. Native `ios/` and `android/` directories are generated and ignored: change `app.config.ts`/plugins, then rerun prebuild rather than editing native files.

SDK 57 on Xcode 27 uses `expo-build-properties` with `ios.enableSceneSupport: true`. The app targets iOS 16.4+ and iPhone portrait layouts. Existing branding is reused; Expo generates an opaque App Store icon.

SDK 57 vendors React Navigation inside Expo Router. Import navigation helpers from `expo-router` or `expo-router/react-navigation`, rather than external `@react-navigation/*` packages. Calendar week order uses `expo-localization.getCalendars()` and respects the iOS calendar setting; an Intl/Sunday fallback covers environments without a reported first weekday.

## Configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile env | API origin; production defaults to `https://shred.day` |
| `EXPO_PUBLIC_BUNDLE_ID` | Mobile env | Defaults to `day.shred`; must match Apple and Google configuration |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Mobile env | iOS OAuth client for this bundle |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Mobile env | Web-type OAuth client for the mobile server audience |
| `APPLE_TEAM_ID` | Mobile build env + Rails env/credentials | Universal links and Apple client-secret signing |
| `GOOGLE_WEB_CLIENT_ID` | Rails env (fallback: `google.client_id` credential) | Expected mobile Google ID token audience |
| `APPLE_BUNDLE_ID` | Rails env | Must match app bundle; defaults to `day.shred` |
| `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Rails env or `apple.key_id/private_key` credentials | Sign in with Apple token exchange/revocation |

Public Expo env values are bundled into the app. Never put Apple private keys, OAuth secrets or API bearer tokens there. Store production public values in EAS's production environment; keep signing/provider secrets in server credentials and EAS credential storage. Production builds should include both Google client IDs before distribution.

Create the iOS OAuth client and a Web-type client for the mobile server audience in the same Google Cloud project, `shred-day`. Use their public IDs for the two mobile Google settings, and set Rails `GOOGLE_WEB_CLIENT_ID` to that Web-type client ID. This Rails setting applies only to mobile ID-token verification; existing website login and Google Sheets continue using their current Rails Google credentials. The mobile flow needs the Web-type client ID, not its client secret.

Expo project: [@shred-day/shred-day](https://expo.dev/accounts/shred-day/projects/shred-day), ID `5843dd0e-9c9d-417c-baef-abcea92c179f`. EAS CLI is invoked as `npx eas-cli@24.13.0`; it is intentionally not a project dependency.

## Authentication and API behavior

- Mobile tokens are opaque, stored as SHA-256 digests on Rails, valid for 30 days, and revocable per device. SecureStore uses device-only keychain access. Logout clears local credentials even when offline; an offline server token remains valid until expiry or server revocation.
- Existing web cookie login remains available. A supplied invalid bearer never falls back to a cookie. Queries clear on logout/account changes; stale 401 responses cannot clear a replacement session.
- Email signup sends a confirmation link and grants no session. Open the link on the website to confirm the address and choose a password, then return to the app to log in. Existing unconfirmed password accounts must complete the same step; the login screen offers confirmation/resend without requiring an old provisional password. Google and Apple use their verified identity without an additional confirmation email. Provider proof alone never activates an unconfirmed password.
- Google and Apple ID proofs are verified on Rails; accounts use provider subjects. Apple uses a short-lived, one-use server nonce, exchanges a matching authorization code, encrypts its refresh credential and revokes it before account deletion. Provider proof replay is rejected.
- A new Google or Apple subject signs into the existing account when its server-verified email matches, ignoring case and surrounding whitespace. No manual connection or prior website login is required. An established provider subject takes precedence over later email changes; ambiguous duplicate emails fail closed without merging journals. Unverified or client-supplied email cannot select an account.
- Apple Hide My Email is a separate address and does not imply a match with the real email. Optionally connecting a provider with a different email requires authentication with the current account within five minutes. Connecting alone does not authorize account deletion; deletion requires fresh password or previously proven provider authentication.
- Account deletion requires a newly created mobile session (five minutes) and `DELETE` confirmation. The app reauthenticates first, removes dependent account data and schedules photo purges. Its completion screen clears local credentials, account queries and Expo image memory/disk caches before enabling Done. Global resort suggestions remain without their deleted owner.
- Dates remain local `YYYY-MM-DD` calendar values. Season selectors use API offsets and the API's UTC date for the annual cutoff, so calendar bounds stay aligned when the device's local date differs from the server's date. Photo upload sends multipart `file`, then day saves send `photo_ids`. Empty arrays remove every attachment; omitted IDs preserve existing attachments.
- Upload failures stay visible and block saving until retried or removed. Canceling an editor cleans up new uploads where requests can complete. Process termination/network loss can leave unattached uploads; durable offline/background recovery is outside this release.
- Shared links use `/d/:id`, the native share sheet and a public-link notice listing photos, resort/date, skis/tags, notes and username. Photos may expose recorded location/capture time; email stays private. Stopping sharing revokes day-page access. Reenabling sharing reuses the same URL. Cached public content is hidden after a confirmed 404; an uncertain toggle response evicts the public cache and refreshes owner state. Previously copied Active Storage image links can remain accessible until the photos are deleted, matching the existing web storage behavior.
- CSV/import/export and Google Sheets connection interfaces remain on the website. Existing server Sheets synchronization still runs for mobile day changes.

Public Rails routes `/privacy`, `/support` and `/.well-known/apple-app-site-association` accompany the app. Universal links need matching Apple team configuration on both sides and deployed association content. Until configured, links open the web shared-day page; `shredday://d/<day_id>` routes directly to the app.

## Existing API limits

- Skis support renaming and deletion. Tags support creation and deletion only; the server rejects deleting a tag still used by logged days. Remove its associations first.
- Resort search keeps the website API's case-insensitive, accent-sensitive matching. Enter the resort's accents when needed; accent-insensitive search would require a separate backend change.
- The account API does not enumerate linked providers. Settings shows methods confirmed on this iPhone and uses a previously proven credential for linking/deletion; it does not invent connection status.
- A lost response cannot prove that a sharing, profile or deletion request changed nothing. Failure copy asks the user to reconnect/retry. Successful account deletion removes the journal and public pages; photo-blob purge is asynchronous.

## Checks

```sh
npm run check
npx expo-doctor
npx expo export --platform ios
```

`check` runs strict TypeScript, Expo ESLint and Jest. Tests cover auth restoration/revocation, stale responses, multipart uploads/cleanup, editor save/discard, date presets/device weekdays, sharing confirmation/revocation, cached public 404s, gear failures and chart selection after refresh. CI runs the mobile gate separately from web/Rails and blocks deployment unless both jobs pass. Keep design handoff sources, implementation plans, native build artifacts and credentials uncommitted.

See [RELEASE.md](RELEASE.md) for signing, TestFlight, metadata and device verification.
