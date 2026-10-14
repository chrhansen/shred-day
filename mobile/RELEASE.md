---
read_when: Signing, distributing or reviewing the Shred.Day iOS app
---

# iOS release runbook

## Build profiles

`eas.json` provides `development` (development client/internal), `simulator` (internal simulator), `preview` (internal device distribution) and `production` (store distribution, remote build numbers and auto-increment). Release builds use `https://shred.day` unless explicitly configured otherwise. Do not distribute a build pointed at a developer's local API.

```sh
npx eas-cli@24.13.0 project:info
npx eas-cli@24.13.0 build --platform ios --profile production
npx eas-cli@24.13.0 submit --platform ios --profile production --id YOUR_VERIFIED_BUILD_ID --groups "Shred.Day Internal" --no-auto-testflight-setup
```

The project belongs to [@shred-day/shred-day](https://expo.dev/accounts/shred-day/projects/shred-day). Apple team `DVPJZW992F` owns the registered `day.shred` App ID with Sign in with Apple and Associated Domains enabled. The Shred.Day App Store Connect record has Apple ID `6821657907`, configured as `submit.production.ios.ascAppId` in `eas.json`. Signing and upload credentials belong in EAS credential storage; do not commit certificates or private keys.

In Google Cloud project `shred-day`, create an iOS OAuth client for the final bundle and a Web-type OAuth client for the mobile server audience. Set their public IDs as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in EAS's production environment, and set Rails `GOOGLE_WEB_CLIENT_ID` to the same Web-type client ID. Both clients must belong to this project. The Rails override applies only to mobile ID-token verification; preserve the existing website/Google Sheets client and secret in Rails credentials. The mobile flow does not use the new Web-type client's secret. Configure Apple's team/key/private-key on Rails for code exchange and account deletion. Regenerate the native app after changing build-time client IDs or associated domains.

During the internal beta, keep the Google OAuth app in testing mode and add testers to its test-user list. Google login requests basic email/profile identity; it does not request Google Sheets permissions.

Deploy the backward-compatible Rails migration and API before the app reaches testers. Verify `/privacy`, `/support`, `/up`, mobile login and the Apple association URL over HTTPS. Database rollback removes native sessions/identities; revoke Apple credentials and preserve any required encrypted identity records before rollback. Web cookie sessions do not depend on the new tables.

EAS submission uploads to App Store Connect/TestFlight; public App Store release is a later App Review action. See [Expo iOS submission](https://docs.expo.dev/submit/ios/).

Submit the inspected build by its exact EAS ID. Use the existing **Shred.Day Internal** group and disable automatic TestFlight setup. EAS CLI's `--what-to-test` scheduling option requires an Enterprise plan; on the current plan, update that build's What to Test notes in App Store Connect after processing.

Version 1.0.1 updates the native UI against the existing deployed API; it adds no backend migration. Its [changelog](CHANGELOG.md) and [API limits](README.md#existing-api-limits) describe the beta scope. Do not treat an uploaded build or passing unit tests as completion of the physical-device gate below.

## Simulator verification

Use Xcode's simulator signing pipeline when building a Release artifact for Device Hub. Keep code signing and base-entitlement injection enabled; Xcode writes simulator claims separately from the code signature. An unsigned build can render screens while failing SecureStore operations. Manually adding Apple capability claims to an ad hoc signature prevents launch; signing those claims with a development certificate also requires a matching profile. Neither result establishes a product authentication failure.

## Dependency review

The 1.0.1 lockfile uses supported SDK 57 patches (Expo 57.0.28, Router 57.0.26). Its reviewed npm runtime audit reports 64 package findings from five inherited leaf advisories, including build/test tools; these are not 64 independent app defects. UI dependencies introduced no new leaf advisory. Avoid `npm audit fix --force`, which proposes incompatible SDK/Router changes.

SDK 57 still includes the `decode-uri-component` [CPU-exhaustion advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr). Router 57.0.26's active link parser uses `URLSearchParams`; four normal/malformed query probes, including 10,000 invalid bytes, made zero calls to a throwing decoder-parser spy. A bundled navigation fallback retains that call. Recheck reachability if navigation changes, and test malformed links on the final native build before distribution. An unchecked decoder override is not a verified remedy: its patched ESM default export differs from the installed CommonJS consumer. Revisit supported upstream patches before public release; tooling advisories also remain open. App navigation imports must use the SDK 57 Router entry points described in [README.md](README.md).

## Store copy

- Name: **Shred.Day**
- Subtitle: **Your ski season, remembered**
- Category: **Sports**
- Keywords: `ski,skiing,snowboard,snow,mountain,resort,season,diary,log`
- Support: `https://shred.day/support`
- Privacy: `https://shred.day/privacy`

Suggested description:

> Keep the days you wish would last forever. Shred.Day is your personal ski-day log: record the mountain, skis, people, notes and photos, then look back through your season's calendar, map and stats. Share a favourite day with a link, or keep your log to yourself. Your existing Shred.Day account works across the app and website.

Review notes: reviewers need a dedicated test account on the deployed API. Core features require connectivity. No subscription or in-app purchase. Settings → Delete account reauthenticates and removes the account. Photo-library access uses the system picker; camera permission is requested on Camera. Native import/export and Google Sheets setup are outside this first release. Populate review credentials in App Store Connect, never in Git.

## Privacy disclosures to review

These are implementation-based starting points for the owner, not submitted answers. Review the final SDKs, hosting/log retention and actual operational practices against [Apple's privacy details](https://developer.apple.com/app-store/app-privacy-details/).

| Data | Why it is retained | Account linkage |
| --- | --- | --- |
| Email, optional name and username | Login, profile and sharing | Linked |
| User/provider IDs | Authentication and account ownership | Linked |
| Photos and notes | Personal day log and optional sharing | Linked |
| Photo GPS metadata and resort locations | Date/resort association and log/map | Linked; includes precise locations when EXIF provides them |
| Ski-day activity and equipment | Season history and stats | Linked; review Fitness and Other User Content categories |
| Support messages and operational diagnostics | Support and service operation | Review actual retention and providers |

No ad/analytics SDK was added, no advertising identifier or tracking permission is requested, and the map does not request current device location. Review third-party SDK privacy manifests from the actual archive. The `ITSAppUsesNonExemptEncryption=false` setting assumes ordinary exempt platform/TLS encryption; the owner must confirm export-compliance answers.

The public privacy/support copy lives in `server/app/views/legal_pages/`. Review it against real business and backup practices before production. Apple's [account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion) requires deletion in the app and revocation of Sign in with Apple credentials; both paths are implemented and covered by backend tests.

## Device and beta gate

- Verify login/signup, Google and Apple on a signed physical iPhone; returning Apple login may omit email. Test existing Google users and authenticated linking.
- Cold start, restart, background/foreground, expired/revoked session, offline launch/retry, logout, and switching accounts.
- Create/edit/delete a day; missing resort and 500-character validation; multiple entries per date and multiple skis/tags. Verify list/calendar selection, shared season state, calendar arrows/swipes and unavailable dates at custom season boundaries, profile cutoff changes, Monday/Sunday device settings, local dates across time zones, date presets and dirty-form cancellation.
- Camera and library permissions; JPEG/HEIC; several uploads; retry/removal; cancel during upload; avatar; processing images; removing the final photo.
- Gallery paging and tapped-index viewer; pinch/double-tap zoom, paging disabled while zoomed, thumbnails, swipe-down dismissal, per-image error/retry and no-photo detail.
- Month/tag/map selection and refresh, missing/failed map fallback, small-phone chart layout, profile/season settings and gear mutation/retry. Check modal sheets and keyboard-safe Save on iPhone SE and a notched iPhone.
- Explicit sharing consent, Copy toast, canceled native share sheet, preview after sheet dismissal, confirmed/uncertain revocation and cached public 404s. Verify signed-out, cold-start universal and custom-scheme links, including malformed percent-encoded queries.
- Delete password/Google/Apple accounts after reauthentication; wrong proof/provider cancel/server failure; verify Apple revocation, removed day links, local credentials/query/image-cache cleanup and completed asynchronous blob purge jobs. The completion screen must not promise that every stored photo disappeared instantly.
- Small/large iPhones, Dynamic Type, VoiceOver, keyboards, permission-denied states, slow network and the production Release binary.
- Capture real, populated iPhone screenshots at App Store Connect's required dimensions. Login, day details, calendar and stats are useful coverage. Simulator placeholders or unverified screens are not release screenshots.

Start with internal TestFlight testers; resolve crashes and critical flow failures before inviting external testers. Public release follows beta feedback and the owner's final store/privacy review.
