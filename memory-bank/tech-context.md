# Tech Context

## Primary Language
JavaScript (ES2020+, no TypeScript, no transpilation)

## Runtime
Chrome Extension — Manifest V3
- Content scripts run in page context (isolated world)
- Background: service worker (`background.js`)
- Popup: standard HTML/CSS/JS (`popup.html`)
- Communication: `chrome.runtime.sendMessage` / `chrome.storage.local`

## Key Files
| File | Role |
|---|---|
| `extension/manifest.json` | MV3 config, permissions, script load order |
| `extension/background.js` | Service worker — minimal, handles activation |
| `extension/popup.html/js/css` | Settings UI: framework + language selection |
| `extension/content/main.js` | Entry point for content scripts — message listener |
| `extension/content/picker.js` | Element picker state machine, mouse events |
| `extension/content/selectors.js` | Core selector generation engine (~1600 lines) |
| `extension/content/panel.js` | Floating panel UI — build, render, drag |
| `extension/content/utils.js` | Shared helpers: toast, drag, render utilities |
| `extension/content/content.css` | All panel + picker styles |

## Content Script Load Order (matters — later files depend on earlier)
1. `utils.js`
2. `selectors.js`
3. `panel.js`
4. `picker.js`
5. `main.js`

All exposed on `window.AQT` namespace object.

## Permissions
- `activeTab` — access current tab
- `scripting` — inject scripts on demand
- `storage` — persist framework/language preference

## Storage
`chrome.storage.local` — key: `aqtSettings` — value: `{ framework, language }`

## No Build Step
Load extension directly from `extension/` directory in Chrome via "Load unpacked". No webpack, no npm, no package.json.

## Constraints
- Must not pollute global scope (use `window.AQT` namespace)
- Must not break page interaction (picker deactivates on escape, panel is draggable)
- Must handle pages that use shadow DOM, iframes, SVG, Ant Design, dynamic IDs
- Content scripts have no access to page's JavaScript variables
