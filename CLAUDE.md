# Switchyard

Switchyard is a local profile switcher for config files. It is the UI successor to `../switch-profile.sh`, which manages named copies of app config files and swaps them into a target path on demand.

## Stack
- Planned app type: browser-accessible local web app.
- Recommended implementation: Next.js + React + TypeScript.
- The app runs as a local server and exposes a browser UI for managing local config profiles.
- Default local URL: `http://127.0.0.1:49287`.
- UI reference: `../Switchyard.html`.
- Legacy behavior reference: `../switch-profile.sh`.
- Runtime data directory: `${XDG_CONFIG_HOME:-$HOME/.config}/switchyard`.
- Tests: [FILL: chosen test runner after scaffolding, e.g. Vitest for core services and Playwright for UI flows].

## Product Behavior
- Users register an app by name and target config file path.
- Users save the current target file as a named profile.
- Users switch to a profile by copying the saved profile content over the target file.
- Users can create, edit, rename, duplicate, delete, and inspect profiles.
- Users can compare the current target file against a saved profile.
- The app should detect whether a profile is active by comparing target content with profile content or hashes.
- The app should detect and clearly show these states:
  - `in sync`
  - `modified`
  - `target missing`
  - `no profiles`

## Architecture Notes
- Keep filesystem behavior behind a small server-side service layer. Browser/client code must never access the filesystem directly.
- The UI should call typed local API routes or server actions, not shell out to the legacy script.
- Bind the development/runtime server to localhost by default.
- Add request protections appropriate for a local file-mutating app:
  - reject non-localhost origins by default
  - avoid broad CORS
  - require POST for mutating actions
  - validate request bodies with explicit schemas
  - never expose arbitrary read/write endpoints
- Suggested service functions:
  - `getConfigDir()`
  - `listApps()`
  - `getApp(appName)`
  - `initApp(appName, targetPath)`
  - `listProfiles(appName)`
  - `readProfile(appName, profileName)`
  - `writeProfile(appName, profileName, content)`
  - `saveCurrentAsProfile(appName, profileName)`
  - `useProfile(appName, profileName, options)`
  - `deleteProfile(appName, profileName)`
  - `renameProfile(appName, oldName, newName)`
  - `duplicateProfile(appName, sourceName, newName)`
  - `diffTargetAgainstProfile(appName, profileName)`
- Store each app as a directory containing:
  - `TARGET`: raw target path as entered by the user.
  - one file per profile.
- Preserve compatibility with the legacy script's storage model where practical, but prefer `switchyard` as the new config directory.
- Do not use `eval` or shell expansion for target paths. Implement safe handling for `~` and environment variables.

## Security And Secrets
- Assume profile files may contain credentials.
- Never log profile contents, target contents, diffs, tokens, API keys, or full credential-like values.
- Mask credential-like fields by default in previews and diffs. Provide an explicit reveal control only where needed.
- Validate app and profile names with a strict allowlist: letters, digits, dot, dash, and underscore. Reject path separators and `..`.
- Keep all profile data local. Do not add analytics, network sync, remote access, or external persistence unless explicitly requested.
- Treat the local HTTP API as privileged because it can overwrite config files. Keep it narrow and localhost-only unless the user explicitly chooses otherwise.
- Before `useProfile` overwrites a target file, show a confirmation with the target path and selected profile.
- Support backup-before-switch. Default it on.

## UI Direction
- Follow `docs/DESIGN_GUIDELINES.md`.
- The first screen is the tool itself: a dense desktop-style utility with app navigation, target status, and profile controls.
- Do not create a marketing landing page.
- Preserve the Switchyard prototype's dark macOS-style window, compact spacing, status dots, profile rows, editor sheet, diff view, confirmation dialogs, and toast feedback.

## Conventions
- Use TypeScript for app logic.
- Keep domain logic independent from the UI framework so it can be tested without rendering.
- Use structured filesystem APIs rather than ad hoc shell commands.
- Prefer small explicit modules over broad abstractions.
- Name domain concepts consistently: `app`, `target`, `profile`, `active`, `modified`, `backup`.
- Keep user-facing copy short and operational.

## Verification
- Add focused tests for filesystem behavior before wiring risky UI actions.
- Test with a temporary config directory, not the user's real `$HOME`.
- Verify at least:
  - app initialization writes `TARGET`
  - save copies target content into a profile
  - use copies profile content into the target path
  - missing target is represented without crashing
  - active profile detection works
  - backup-before-switch creates a backup profile or backup file
  - invalid app/profile names are rejected
  - profile contents are not logged
- For UI changes, run the app and verify desktop and narrow layouts with screenshots.

## Constraints / Do Not Overengineer
- [FILL: user-specific constraints, e.g. package manager, deployment mode, whether browser access should be localhost-only or LAN-accessible].
- Do not add background daemons, cloud sync, accounts, or telemetry unless explicitly requested.
- Do not make the local API LAN-accessible by default.
- Do not store secrets outside the configured local profile directory.
- Do not implement broad plugin systems or multi-user collaboration for the first version.
- Do not change the user's real config files in tests.
