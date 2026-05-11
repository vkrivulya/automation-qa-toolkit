# Architecture

## Overview
The extension has three layers: **Popup** (settings), **Background** (service worker), and **Content Scripts** (injected into every page). The content scripts communicate with the popup via `chrome.runtime.sendMessage`.

```
┌─────────────────────────────────────────┐
│              Chrome Extension           │
│                                         │
│  ┌──────────┐      ┌─────────────────┐  │
│  │  Popup   │─────▶│   Background    │  │
│  │(settings)│      │ (service worker)│  │
│  └──────────┘      └────────┬────────┘  │
│                             │ sendMessage│
│                   ┌─────────▼────────┐  │
│                   │  Content Scripts  │  │
│                   │                  │  │
│                   │  main.js         │  │
│                   │    └─ picker.js  │  │
│                   │         └─ selectors.js │
│                   │    └─ panel.js   │  │
│                   │    └─ utils.js   │  │
│                   └──────────────────┘  │
└─────────────────────────────────────────┘
```

## Component Responsibilities

### `picker.js` — Element Picker State Machine
- Manages `isPickerActive` flag
- Attaches/detaches `mousemove`, `click`, `keydown` listeners
- Uses `elementsFromPoint` to find the real target (skips the AQT panel itself)
- On click: calls `selectors.js` to generate selectors, then `panel.js` to show them
- Highlights element with CSS outline on hover

### `selectors.js` — Selector Generation Engine
Core logic. Entry point: `window.AQT.generateSelectors(element, framework, language)`

Internal pipeline:
1. **Detect element type** — is it a composite control (Ant Design select, datepicker)? SVG? Interactive?
2. **Find best target** — for composite controls, walk up to the right ancestor
3. **Generate selector candidates** — try strategies in priority order:
   - QA attributes (`data-testid`, `data-qa`, `data-cy`, etc.)
   - `id` (only if not dynamic — checked via pattern matching)
   - `aria-label`
   - `href` (for links)
   - Text content (for buttons, links)
   - Context text (label + element)
   - `name` attribute
   - Class-based (last resort)
4. **Score stability** — rate each candidate: `stable` / `medium` / `weak`
5. **Format output** — wrap in framework-specific syntax (Java/Python/TS)
6. **Add alternatives** — for dynamic IDs or weak primary, include fallbacks

### `panel.js` — Floating Panel UI
- Creates and injects the panel DOM on first use
- `showFloatingPanel(selectorsData)` — renders selector results
- `buildPanelContent()` — builds HTML for strategy groups, copy buttons, stability badges
- `enablePanelDrag()` — makes panel draggable by header
- Reads framework/language from `chrome.storage.local` on each show

### `utils.js` — Shared Utilities
- `showToast(message)` — brief notification
- Framework/language dropdown rendering helpers
- Stability badge color mapping

### `main.js` — Message Entry Point
Listens for `{ action: 'start-picker' }` from popup, calls `window.AQT.startPicker()`.

### `popup.js` — Settings Persistence
- Renders framework selector with language sub-options
- Saves to `chrome.storage.local`
- Sends `start-picker` message to active tab

## Data Flow: Element Selection

```
User clicks element
       │
  picker.js: onClick(event)
       │
  elementsFromPoint → find real target (skip panel)
       │
  selectors.js: generateSelectors(element)
       │  ├─ detectCompositeControl() → maybe walk to parent
       │  ├─ generateCandidates() → array of { strategy, css, xpath, stability }
       │  └─ formatForFramework(framework, language) → { primary, alternatives, snippets }
       │
  panel.js: showFloatingPanel(result)
       │
  Render panel with copy buttons
```

## Global Namespace
All content script exports live on `window.AQT`:
- `window.AQT.startPicker()`
- `window.AQT.stopPicker()`
- `window.AQT.generateSelectors(el, framework, language)`
- `window.AQT.showFloatingPanel(data)`
- `window.AQT.showToast(msg)`

## Known Complexity Areas
- **Dynamic ID detection** (`selectors.js`): uses regex patterns to identify auto-generated IDs (UUIDs, numeric suffixes, etc.) and skips them as primary selectors
- **Ant Design composite controls**: visible `<input>` is not the right target — must walk up to `.ant-select`, `.ant-picker`, etc.
- **SVG handling**: SVG elements need namespace-aware selector generation
- **Selector escaping**: CSS selectors with special chars, XPath string quoting, framework string escaping are all separate code paths
