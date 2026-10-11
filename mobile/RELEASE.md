---
read_when: Signing, distributing or reviewing the Shred.Day iOS app
---

# iOS release runbook

## Build profiles

`eas.json` provides `development` (development client/internal), `simulator` (internal simulator), `preview` (internal device distribution) and `production` (store distribution, remote build numbers and auto-increment). Release builds use `https://shred.day` unless explicitly configured otherwise. Do not distribute a build pointed at a developer's local API.

```sh
npx eas-cli@24.12.1 project:info
npx eas-cli@24.12.1 build --platform ios --profile production
npx eas-cli@24.12.1 submit --platform ios --profile production --latest
```

The project belongs to [@shred-day/shred-day](https://expo.dev/accounts/shred-day/projects/shred-day). The owner selects the Apple Developer team, confirms active program membership and signs in to Apple when EAS requests it. Register `day.shred` (subject to availability), enable Sign in with Apple, create the App Store Connect app, and configure its numeric app ID as `submit.production.ios.ascAppId` in `eas.json`. EAS manages signing credentials; do not commit certificates or private keys.

Create an iOS Google OAuth client in the same Google Cloud project as the existing web client, using the final bundle. Set both public client IDs in EAS's production environment and the matching web audience on Rails. Configure Apple's team/key/private-key on Rails for code exchange and account deletion. Regenerate the native app after changing build-time client IDs or associated domains.

Deploy the backward-compatible Rails migration and API before the app reaches testers. Verify `/privacy`, `/support`, `/up`, mobile login and the Apple association URL over HTTPS. Database rollback removes native sessions/identities; revoke Apple credentials and preserve any required encrypted identity records before rollback. Web cookie sessions do not depend on the new tables.

EAS submission uploads to App Store Connect/TestFlight; public App Store release is a later App Review action. See [Expo iOS submission](https://docs.expo.dev/submit/ios/).

## Dependency review

SDK 57 still includes the `decode-uri-component` [CPU-exhaustion advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr). This app's Expo link parser uses `URLSearchParams`; the reviewed normal and malformed queries did not call the vulnerable decoder. A bundled React Navigation fallback retains that call. Recheck reachability if navigation changes, and test malformed links on a native device before distribution. Avoid an unchecked decoder override: the patched ESM package is incompatible with the installed CommonJS consumer. Revisit supported patched dependencies before public release; remaining tooling advisories also need review.

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
- Create/edit/delete a day; current/previous seasons; local dates across time zones; three-per-date and 500-character validation; multiple skis/tags.
- Camera and library permissions; JPEG/HEIC; several uploads; retry/removal; cancel during upload; avatar; processing images; removing the final photo.
- Stats/map, profile/season settings, public sharing/revocation, cold-start universal links and canceled share sheet.
- Delete password/Google/Apple accounts after reauthentication; verify Apple revocation, removed day links and completed blob purge jobs.
- Small/large iPhones, Dynamic Type, VoiceOver, keyboards, permission-denied states, slow network and the production Release binary.
- Capture real, populated iPhone screenshots at App Store Connect's required dimensions. Login, day details, calendar and stats are useful coverage. Simulator placeholders or unverified screens are not release screenshots.

Start with internal TestFlight testers; resolve crashes and critical flow failures before inviting external testers. Public release follows beta feedback and the owner's final store/privacy review.
