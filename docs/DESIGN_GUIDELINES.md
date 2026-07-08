# Switchyard Design Guidelines

These guidelines are derived from `../../Switchyard.html`, which is the visual and interaction prototype for the app.

## Product Feel
- Build a compact local utility for repeated use, not a marketing site.
- The interface should feel like a serious macOS-style developer tool: quiet, precise, and status-forward.
- Prioritize scanning, comparison, and fast action over decorative content.
- Treat credential safety as part of the interface, not an afterthought.

## Layout
- Use a centered desktop window as the primary composition.
- Target desktop window size from the prototype: about `1200px` wide by `760px` high.
- Use a two-pane layout:
  - Left sidebar, about `248px`, for app navigation and global settings.
  - Main pane for selected app status, profile actions, profile list, banners, and empty states.
- The first viewport should show the working tool immediately.
- Avoid nested cards. Use panes, rows, sheets, menus, and dialogs.

## Window Shell
- Dark page background: `#0c0e12`.
- Window background: `#14161b`.
- Sidebar background: `#101217`.
- Use a subtle radial background behind the window, from `#171a21` to `#0c0e12`.
- Window radius: `14px`.
- Use a thin border around the window: `rgba(255,255,255,0.09)`.
- Include macOS traffic-light dots in the sidebar header:
  - red `#ff5f57`
  - yellow `#febc2e`
  - green `#28c840`

## Typography
- Primary font: IBM Plex Sans.
- Monospace font: IBM Plex Mono.
- Use monospace for app names, target paths, profile paths, config contents, and diff lines.
- Keep typography compact:
  - app header name around `19px`
  - body controls around `12px`
  - labels around `10px` to `11px`
  - editor text around `12.5px`
- Keep letter spacing at `0` except small uppercase section labels, where a modest tracking value is acceptable.

## Color Tokens
- Background: `#0c0e12`
- Raised window: `#14161b`
- Sidebar: `#101217`
- Sheet/menu: `#16181e`, `#1d2027`
- Input/editor: `#0f1115`
- Row surface: `#1a1d24`, `#22262e`
- Primary text: `#e8eaee`
- Secondary text: `#c6ccd6`
- Muted text: `#9aa2af`
- Quiet text: `#6b7280`
- Disabled text: `#4b5260`
- Accent: `#3fd2ae`
- Accent hover: `#7ee6cd`
- Warning: `#e0a458`
- Danger: `#e5715f`
- Danger text: `#e5988a`
- Optional accent variants from prototype: `#6ea8fe`, `#c792ea`

## Navigation
- Sidebar rows should contain:
  - status dot
  - app name
  - profile count
  - short status label
- Selected app row uses a subtle white overlay, not a loud fill.
- Use status dot colors:
  - accent for in sync
  - warning for modified
  - danger for target missing
- Sidebar footer includes a backup-before-switch toggle and the config directory path.

## Main Header
- Show app name, status pill, target label, and target path.
- Header actions:
  - `New profile`
  - `Save current as profile...`
  - overflow menu
- Disable save-current when the target file is missing.
- Overflow menu should include:
  - reveal config folder
  - refresh
  - remove app

## Profile List
- Use row-based profile entries.
- Each row should show:
  - profile name
  - modified time
  - status pill, e.g. `ACTIVE`, `saved`, or placeholder
  - `Use`
  - `Edit`
  - `Diff`
  - overflow menu
- Active profile rows get a quiet accent tint and accent border.
- The active profile button reads `In use` and is visually disabled.
- Row overflow menu should include:
  - rename
  - duplicate
  - reveal in Finder
  - delete

## Banners And Empty States
- Show a compact banner when:
  - target file is missing
  - target content has been modified and no saved profile matches it
- Missing target uses danger coloring.
- Modified target uses warning coloring.
- Empty states should be direct and actionable, with controls for adding the first app or profile.

## Editor
- Use a right-side sheet for profile editing.
- Sheet width from prototype: about `520px`.
- The sheet overlays the main window with a dark translucent scrim.
- Include:
  - title `Edit profile`
  - profile path
  - close button
  - warning that contents may contain credentials
  - monospace textarea
  - cancel and save actions
- The editor should not auto-log or expose contents outside the textarea.

## Diff View
- Diff compares current target content against selected profile content.
- Mask secrets by default.
- Provide an explicit reveal/mask toggle.
- Use monospace lines.
- Use danger tint for removed target lines and accent tint for added profile lines.
- Show identical state clearly when there are no differences.

## Dialogs
- Use centered confirmation dialogs over a translucent dark overlay.
- Dialogs should be concise and action-specific:
  - add app
  - save profile
  - create profile
  - switch profile
  - rename profile
  - delete profile
  - remove app
- Destructive confirm buttons use danger color.
- Switching profiles must show target path, profile path, and backup toggle.
- Existing-profile overwrite should require a second explicit confirmation state.

## Controls
- Buttons use `6px` to `7px` radius.
- Menus use about `9px` radius.
- The window can use `14px` radius.
- Prefer icon buttons for overflow, close, and add where practical.
- Use tooltips or accessible labels for icon-only buttons.
- Toggles should be compact, with accent fill when enabled.
- Keep hover effects restrained: border brightening, slight brightness, or subtle white overlays.

## Motion
- Use short, functional motion only:
  - fade overlays around `150ms`
  - pop menus around `120ms`
  - slide editor sheet around `180ms`
  - toast entrance with small vertical movement
- Avoid decorative animations.

## Copy
- Use short operational labels.
- Good labels:
  - `Add app`
  - `New profile`
  - `Save current as profile...`
  - `Use`
  - `In use`
  - `Diff`
  - `Reveal secrets`
  - `Mask secrets`
  - `Backup before switch`
- Avoid explanatory in-app prose except for safety warnings, missing-target states, and confirmations.

## Accessibility And Responsiveness
- All controls must be keyboard reachable.
- Icon-only controls need accessible labels.
- Text must not overflow buttons, rows, or dialogs.
- Long paths should truncate with ellipsis in headers and rows.
- Keep fixed-format elements stable so row height does not shift on hover or status changes.
- Provide a narrow layout before release, either by allowing horizontal scroll inside the desktop window or adapting sidebar/main panes.
