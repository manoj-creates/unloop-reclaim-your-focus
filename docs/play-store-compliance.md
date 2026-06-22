# Google Play Store Compliance — Unloop

Last reviewed: 2026-06-15

This document tracks Unloop's Play Console submission requirements and is
the source of truth for the Data Safety form and Permissions Declarations.

---

## 1. Permissions Declarations (Play Console → App content)

### 1.1 Accessibility Service — REQUIRED declaration

> Unloop is a digital-wellbeing app that helps users reduce time spent in
> short-video feeds (Instagram Reels, YouTube Shorts, Facebook Reels,
> TikTok, Snapchat Spotlight).
>
> The Accessibility Service is used solely to detect when one of these
> short-video feeds becomes visible on screen, so the app can display its
> focus overlay and increment the user's daily session counter. The
> service inspects window state and view-identifier signals from a fixed
> allow-list of packages declared in `AndroidManifest.xml` `<queries>`.
> It does not read or transmit the text of any messages, posts, captions,
> comments, passwords, or form fields.
>
> A prominent in-app disclosure
> (`src/components/AccessibilityDisclosure.tsx`) is shown before the user
> is sent to Settings to enable the service. The user must explicitly
> acknowledge the disclosure to proceed. The disclosure and revocation
> instructions are also published in our Privacy Policy
> (`/privacy`).
>
> The service is essential to the core advertised functionality and
> cannot be replaced by `UsageStatsManager` because we need event-time
> detection of feed visibility, not retrospective daily totals.

### 1.2 SYSTEM_ALERT_WINDOW (overlay)

> Used to render a small floating "focus pill" above short-video feeds
> showing the user's current session count. The overlay is owned by a
> foreground service (`OverlayService`) of type `specialUse` and is only
> visible while a tracked feed is in the foreground. No other content
> is drawn over other apps.

### 1.3 FOREGROUND_SERVICE_SPECIAL_USE

> `specialUse` subtype: *"Floating focus-counter overlay displayed above
> short-video feeds."* The service is bound to overlay visibility and is
> stopped when the user revokes overlay or accessibility permission.

### 1.4 QUERY_ALL_PACKAGES — REMOVED

`QUERY_ALL_PACKAGES` is no longer declared. Package visibility uses a
fixed `<queries>` block listing only the short-video apps we detect.
Adding a new detector requires both a new `<package>` entry and a code
change, so visibility stays minimal.

---

## 2. Data Safety form (Play Console → App content → Data safety)

### Data collected

| Data type | Collected | Shared | Optional | Purpose | Encrypted in transit | User can request deletion |
|---|---|---|---|---|---|---|
| Email address | Yes (sign-in) | No | No (required to sync) | Account management | Yes | Yes |
| User ID | Yes | No | No | Account management, app functionality | Yes | Yes |
| App activity → In-app actions | Yes (session counts, streaks, goals) | No | Yes (works offline / signed-out) | App functionality, analytics | Yes | Yes |
| Other app info → Other app performance data | Yes (anonymous crash/error signals) | No | Yes | App functionality, diagnostics | Yes | N/A (anonymous) |

### Data NOT collected

Photos, videos, audio, files, contacts, calendar, SMS, call logs,
location (precise or approximate), web browsing history, device or other
IDs beyond the account ID, financial info, health/fitness, messages,
microphone, on-device sensors, the textual content of any other app.

### Security practices

- Data is encrypted in transit (TLS 1.2+).
- Users can request deletion of their data from inside the app (Profile)
  or by emailing `hello@unloop.app`.
- We follow the Play Families Policy: the app is not directed at
  children under 13 and we do not knowingly collect data from them.
- Data is not sold to third parties.
- We have committed to follow Google Play's Families Policy / Data
  Safety guidelines.

---

## 3. Manifest changes shipped for compliance

- Removed `QUERY_ALL_PACKAGES`; added targeted `<queries>` block.
- `targetSdkVersion` bumped to **35** (required for new apps from
  Aug 2025).
- `android:allowBackup="false"` + `dataExtractionRules` excluding all
  domains — prevents Auth tokens and local state from being copied into
  the user's personal Google Drive backup or device-to-device transfer.
- Accessibility Service retains `BIND_ACCESSIBILITY_SERVICE` permission
  guard and `exported="true"` (required by the OS).
- Foreground service `specialUse` carries `PROPERTY_SPECIAL_USE_FGS_SUBTYPE`
  describing the use to Play reviewers.

---

## 4. In-app surfaces required by policy

| Requirement | Location |
|---|---|
| Privacy Policy URL (Play Console + in-app) | `/privacy` route, linked from Settings and from the Accessibility disclosure |
| Accessibility prominent disclosure | `src/components/AccessibilityDisclosure.tsx`, shown before opening Settings |
| Account & data deletion | Profile → Reset Progress / Delete account, plus `mailto:hello@unloop.app` |

---

## 5. Submission checklist

- [x] Remove `QUERY_ALL_PACKAGES`
- [x] Add `<queries>` allow-list
- [x] Disable Auto Backup with `dataExtractionRules.xml`
- [x] Bump `targetSdkVersion` to 35
- [x] Publish Privacy Policy at `/privacy`
- [x] Ship Accessibility Service prominent disclosure
- [x] Document Data Safety answers (this file)
- [ ] Paste declaration §1.1 into Play Console Permissions Declaration
- [ ] Submit Data Safety form using §2 above
- [ ] Set Privacy Policy URL in Play Console: `https://unloop-habit.lovable.app/privacy`
- [ ] Provide a reviewer login or screencast demonstrating the
      Accessibility disclosure flow
