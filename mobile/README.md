---
read_when: Developing or configuring the Shred.Day Expo app
---

# Shred.Day for iPhone

Independent npm project using Expo SDK 57, React Native 0.86, TypeScript, Expo Router and TanStack Query. Uses the existing Rails accounts, data and API. Native screens cover login/signup, season lists/calendars, day editing, photos, stats/maps, equipment, tags, profile settings, sharing and account deletion.

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

Expo project: [@shred-day/shred-day](https://expo.dev/accounts/shred-day/projects/shred-day), ID `5843dd0e-9c9d-417c-baef-abcea92c179f`. EAS CLI is invoked as `npx eas-cli@24.12.1`; it is intentionally not a project dependency.

## Authentication and API behavior

- Mobile tokens are opaque, stored as SHA-256 digests on Rails, valid for 30 days, and revocable per device. SecureStore uses device-only keychain access. Logout clears local credentials even when offline; an offline server token remains valid until expiry or server revocation.
- Existing web cookie login remains available. A supplied invalid bearer never falls back to a cookie. Queries clear on logout/account changes; stale 401 responses cannot clear a replacement session.
- Google and Apple ID proofs are verified on Rails; accounts use provider subjects. Apple uses a short-lived, one-use server nonce, exchanges a matching authorization code, encrypts its refresh credential and revokes it before account deletion. Provider proof replay is rejected.
- Existing Google website logins now record subjects. A legacy Google account with a non-Gmail, non-Workspace email and no subject identity needs one website Google login before native login, or authenticated linking in Settings. Matching an external email alone cannot take over an account.
- Account deletion requires a newly created mobile session (five minutes) and `DELETE` confirmation. The app reauthenticates first, removes dependent account data and schedules photo purges. Global resort suggestions remain without their deleted owner.
- Dates remain local `YYYY-MM-DD` calendar values. Season selectors use API offsets. Photo upload sends multipart `file`, then day saves send `photo_ids`. Empty arrays remove every attachment; omitted IDs preserve existing attachments.
- Upload failures stay visible and block saving until retried or removed. Canceling an editor cleans up new uploads where requests can complete. Process termination/network loss can leave unattached uploads; durable offline/background recovery is outside this release.
- Shared links use `/d/:id`, the native share sheet and a public-link notice. Stopping sharing revokes day-page access. Previously copied Active Storage image links can remain accessible until the photos are deleted, matching the existing web storage behavior.
- CSV/import/export and Google Sheets connection interfaces remain on the website. Existing server Sheets synchronization still runs for mobile day changes.

Public Rails routes `/privacy`, `/support` and `/.well-known/apple-app-site-association` accompany the app. Universal links need matching Apple team configuration on both sides and deployed association content. Until configured, links open the web shared-day page; `shredday://d/<day_id>` routes directly to the app.

## Checks

```sh
npm run check
npx expo-doctor
npx expo export --platform ios
```

`check` runs strict TypeScript, Expo ESLint and Jest. Tests cover auth restoration/revocation, stale responses, multipart transport and upload failure/cleanup. CI runs the mobile gate separately from web/Rails and blocks deployment unless both jobs pass.

See [RELEASE.md](RELEASE.md) for signing, TestFlight, metadata and device verification.
