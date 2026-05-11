# Bug Report Generator — Implementation Plan

**Feature:** Bug Report Generator  
**Planned by:** Architect agent  
**Date:** 2026-05-11  
**Status:** Draft — awaiting approval before any code is written

---

## Phase 1 — Requirements Elicitation

The following questions are resolved with sensible defaults for a solo QA engineer on a zero-build vanilla JS Chrome extension. Assumptions are called out explicitly.

---

### Q1: What does the report contain?

**Default answer: All of the following fields.**

| Field | Source | Notes |
|---|---|---|
| Page URL | `window.location.href` | Always present |
| Page title | `document.title` | Always present |
| Timestamp | `new Date().toISOString()` | UTC ISO 8601 |
| Browser info | `navigator.userAgent` | Parsed to a human-readable string |
| Element tag and role | `element.tagName`, `element.getAttribute('role')` | From already-captured selector data |
| Primary selector (recommended) | Already in `selectors` object from picker | The `primary` snippet already shown in the panel |
| Selector strategy and stability | Already in `selectors` object | e.g., `data-testid / stable` |
| Element text content | `element.innerText` (trimmed, max 200 chars) | Useful context |
| Element bounding box | `element.getBoundingClientRect()` | x, y, width, height as integers |
| Full-page screenshot (viewport) | `chrome.tabs.captureVisibleTab` via background | Captured at report generation time |
| Screenshot with element highlighted | Overlay drawn on a canvas over the captured image | Red box matching the element's bounding rect |
| Steps to reproduce | Placeholder text | QA fills this in manually |
| Expected behavior | Placeholder text | QA fills this in manually |
| Actual behavior | Placeholder text | QA fills this in manually |

**Assumption:** Steps/expected/actual are left as placeholder strings in the output so the QA engineer fills them in after pasting or opening the file. They are NOT form fields inside the extension — keeping scope minimal.

---

### Q2: What is the output format?

**Default answer: Two actions — (a) Download as Markdown file AND (b) Copy to clipboard as Markdown.**

Rationale:
- Markdown is the lingua franca of bug trackers (GitHub Issues, Jira, Linear all render it).
- Download gives a durable file; clipboard copy is the fastest path to pasting into a ticket.
- "Open in new tab as HTML" adds rendering complexity (a full HTML page builder) for marginal gain — deferred.
- Template editor is out of scope for v1 — fixed format keeps maintenance low.

The Markdown file is named: `bug-report-YYYY-MM-DD_HH-mm-ss.md`

**Screenshot:** Embedded in the Markdown as a base64 `data:` URI inside an `<img>` tag (GitHub and most Markdown renderers render inline HTML). The highlighted screenshot is included. If screenshot capture fails gracefully (e.g., on a restricted page), the report still generates without it and includes a note.

**Assumption:** Base64 screenshots make the Markdown file self-contained (no separate image file). File sizes are typically 200–600 KB for a viewport screenshot — acceptable for a bug report.

---

### Q3: How is the feature triggered?

**Default answer: A "Generate Bug Report" button added to the existing floating panel, in the `aqt-panel-actions` row alongside the existing "Pick another element" button.**

Rationale:
- The panel is shown immediately after picking an element — that is exactly the right moment to generate a report about that element.
- A separate toolbar button would require a second invocation with no element context.
- Adding a button to the existing panel requires no new UI surface, no new popup changes, and no new manifest permissions beyond what is needed for screenshot capture anyway.

---

### Q4: Does it need a screenshot, and should the element be highlighted?

**Default answer: Yes to both.**

- A viewport screenshot is captured using `chrome.tabs.captureVisibleTab` called from the background service worker (content scripts cannot call this API directly — a message must be sent to background.js).
- The highlight is drawn as a semi-transparent red rectangle overlaid on the screenshot using an off-screen `<canvas>` element in the content script. The element's bounding box (`getBoundingClientRect`) maps directly to the captured viewport coordinates.
- If the element is scrolled partially out of view, the visible portion is still highlighted correctly (bounding rect clips naturally).

**Assumption:** The `tabs` permission must be added to `manifest.json` (currently only `activeTab`, `scripting`, `storage` are listed). `captureVisibleTab` requires the `activeTab` permission which is already present, but background service workers need `tabs` to be able to call it. This will be added to the manifest in Step 1.

---

### Q5: Should the report be customizable?

**Default answer: Fixed format, no template editor.**

Rationale: Solo engineer, zero-build constraint, iterative development. A hardcoded Markdown template is easy to adjust in a single function later. A template editor adds a settings UI surface, storage schema changes, and a rendering layer — all out of scope for v1.

---

## Phase 2 — Technical Design

### Approach A — Fully In-Content-Script (no new background message)

All report generation logic lives in a new `content/report.js` content script. The screenshot step sends a one-shot message to `background.js` to call `captureVisibleTab`, gets back the data URL, draws the highlight canvas, and builds the Markdown string.

**Pros:**
- Minimal background.js changes (one new message handler, ~5 lines).
- All DOM access (bounding rect, text, etc.) happens naturally in the content script.
- Fits the existing architecture exactly — `window.AQT.generateReport(selectors, element)` mirrors `window.AQT.showFloatingPanel`.
- Canvas-based highlight is pure DOM, no extra permissions.

**Cons:**
- Must pass the element reference from `picker.js` into the new report function. Currently `selectElement` in `picker.js` does not retain the element reference after showing the panel — this needs a small refactor to store it.
- Base64 canvas roundtrip (capture → content script → draw on canvas → data URL) is slightly awkward but well-established.

---

### Approach B — Dedicated Background Offscreen Document

Use the MV3 Offscreen API (`chrome.offscreen.createDocument`) to render the report in an isolated HTML page and handle the screenshot there.

**Pros:**
- Cleaner separation of concerns — report rendering fully isolated.
- No risk of polluting the page DOM with canvas elements.

**Cons:**
- MV3 Offscreen API requires Chrome 109+ and adds significant boilerplate (create/destroy offscreen doc, message routing through background).
- Canvas can only draw the screenshot if the image data is passed via message — same roundtrip cost, more code.
- Much higher complexity for the same outcome.
- Unnecessary: a temporary off-screen canvas appended to `document.body` with `visibility:hidden` and immediately removed is completely safe.

---

### Chosen Approach: A — Fully In-Content-Script

Approach A is chosen. It is the simplest path that fits the existing architecture, requires no new API surface, and keeps the extension loadable directly from the folder with no build step. The one small addition to `background.js` (capture message handler) is consistent with how `start-picker` messaging already works.

---

## Phase 3 — Implementation Plan

### Step-by-step breakdown (6 steps, implement one at a time)

---

### Step 1 — Manifest & Background: add screenshot permission and capture handler

**Files changed:**
- `extension/manifest.json`
- `extension/background.js`

**What to do:**

1. Add `"tabs"` to the `permissions` array in `manifest.json`.  
   (`captureVisibleTab` requires this when called from a service worker even with `activeTab` already present.)

2. In `background.js`, add a message listener for `{ action: "capture-screenshot" }`.  
   It calls `chrome.tabs.captureVisibleTab(null, { format: "png" })` and replies with `{ dataUrl }`.  
   On error it replies with `{ error: message }`.

**Why isolated:** Manifest and background changes are self-contained and testable by loading the extension and checking that no console errors appear.

**Acceptance criteria:**
- Extension loads without errors after manifest change.
- Sending `{ action: "capture-screenshot" }` from a content script returns a PNG data URL.

---

### Step 2 — Element retention: store last picked element reference

**Files changed:**
- `extension/content/picker.js`

**What to do:**

In `window.AQT.selectElement`, after `selectors` is resolved and before `stopPicker()` is called, store the resolved element reference on the namespace:

```js
window.AQT.pickerState.lastPickedElement = targetElement || originalElement;
```

Also reset it to `null` in `stopPicker()` (or leave it — it is harmless to keep the reference).

**Why isolated:** Tiny, single-line addition. No logic changes. The reference is already in scope; we just need to persist it so `report.js` can read it later.

**Acceptance criteria:**
- After picking an element, `window.AQT.pickerState.lastPickedElement` points to the correct DOM node (verifiable in DevTools console).

---

### Step 3 — Report builder: new `content/report.js`

**Files changed:**
- `extension/content/report.js` (new file)
- `extension/manifest.json` (add to content_scripts `js` array, after `panel.js`)

**What to do:**

Create `window.AQT.generateBugReport(selectors)` — a single async function with the following internal steps:

1. **Collect metadata** from DOM and `selectors` object:
   - `pageUrl`, `pageTitle`, `timestamp`, `browserInfo`
   - `elementTag`, `elementRole`, `elementText` (trimmed, max 200 chars)
   - `boundingBox` from `window.AQT.pickerState.lastPickedElement.getBoundingClientRect()`
   - `primarySelector`, `strategy`, `stability` from `selectors`

2. **Capture screenshot:**  
   Send `{ action: "capture-screenshot" }` via `chrome.runtime.sendMessage`.  
   On success, proceed. On error or no response, set `screenshotDataUrl = null`.

3. **Draw highlight on canvas:**  
   If `screenshotDataUrl` is set:
   - Create an off-screen `<canvas>` (not appended to DOM).
   - Draw the screenshot image onto it at `devicePixelRatio`-scaled dimensions.
   - Draw a semi-transparent red rectangle over the element's bounding box.
   - Draw a red 2px stroke border around it.
   - Export as `canvas.toDataURL("image/png")` → `highlightedDataUrl`.

4. **Build Markdown string:**  
   Assemble the report using a template literal. Include all metadata fields, the highlighted screenshot as `<img src="...">`, and placeholder sections for Steps / Expected / Actual.

5. **Return** `{ markdown: string, filename: string }`.

**Markdown template structure:**

```markdown
# Bug Report

**URL:** {pageUrl}  
**Page title:** {pageTitle}  
**Timestamp:** {timestamp}  
**Browser:** {browserInfo}

---

## Element Under Test

| Field | Value |
|---|---|
| Tag | {elementTag} |
| Role | {elementRole} |
| Text | {elementText} |
| Bounding box | x:{x} y:{y} w:{width} h:{height} |
| Selector | `{primarySelector}` |
| Strategy | {strategy} |
| Stability | {stability} |

---

## Screenshot

<img src="{highlightedDataUrl}" width="800" alt="Screenshot with highlighted element" />

---

## Steps to Reproduce

1. <!-- Fill in steps -->

## Expected Behavior

<!-- Describe expected behavior -->

## Actual Behavior

<!-- Describe actual behavior -->
```

**Why isolated:** Pure logic module. No DOM side effects beyond the off-screen canvas. Testable by calling from DevTools console after picking an element.

**Acceptance criteria:**
- `await window.AQT.generateBugReport(selectors)` returns an object with `markdown` and `filename`.
- The markdown string contains all metadata fields populated correctly.
- The embedded screenshot contains a red highlight rectangle over the picked element.

---

### Step 4 — Download and clipboard helpers in `utils.js`

**Files changed:**
- `extension/content/utils.js`

**What to do:**

Add two helper functions to `window.AQT`:

1. `window.AQT.downloadTextFile(filename, content)`:
   - Creates a `Blob` with `text/markdown; charset=utf-8`.
   - Creates a temporary `<a>` element with `download` attribute.
   - Programmatically clicks it and revokes the object URL.

2. `window.AQT.copyToClipboard(text)`:
   - Calls `navigator.clipboard.writeText(text)`.
   - Returns the promise (caller handles toast feedback).

These already have a partial pattern in `panel.js` (`navigator.clipboard.writeText`). This refactor just lifts them to `utils.js` where they belong.

**Acceptance criteria:**
- Calling `window.AQT.downloadTextFile("test.md", "# Hello")` triggers a browser download.
- `await window.AQT.copyToClipboard("hello")` writes to clipboard without errors.

---

### Step 5 — Panel integration: add "Generate Bug Report" button

**Files changed:**
- `extension/content/panel.js`
- `extension/content/content.css`

**What to do:**

**panel.js:**

1. In `buildPanelContent`, add a "Generate Bug Report" button to the `aqt-panel-actions` div, alongside the existing "Pick another element" button:

```html
<button id="aqt-generate-report" class="aqt-panel-copy aqt-panel-copy-secondary">Generate Bug Report</button>
```

2. In `bindPanelEvents`, add a handler for `#aqt-generate-report`:
   - On click: disable the button and set text to "Generating…"
   - Await `window.AQT.generateBugReport(selectors)`
   - Call `window.AQT.downloadTextFile(result.filename, result.markdown)`
   - Call `await window.AQT.copyToClipboard(result.markdown)`
   - Show toast: "Bug report downloaded and copied to clipboard"
   - On error: show toast: "Failed to generate report" and log to console
   - Re-enable button regardless

**content.css:**

Add `.aqt-panel-copy-secondary` style — same shape as `.aqt-panel-copy` but with a secondary/muted visual treatment (outline style rather than filled) so it is visually subordinate to "Pick another element".

**Acceptance criteria:**
- "Generate Bug Report" button appears in the panel after picking an element.
- Clicking it shows "Generating…" state, then downloads a `.md` file and shows the success toast.
- Clipboard contains the same Markdown.
- If screenshot capture fails (e.g., restricted page), the report still downloads without the image section, with a note: `_(Screenshot not available)_`.

---

### Step 6 — Load order: add report.js to manifest

**Files changed:**
- `extension/manifest.json`

**What to do:**

Add `"content/report.js"` to the `content_scripts` `js` array, between `panel.js` and `picker.js`:

```json
"js": [
  "content/utils.js",
  "content/selectors.js",
  "content/panel.js",
  "content/report.js",
  "content/picker.js",
  "content/main.js"
]
```

This ensures `report.js` loads after `utils.js` (uses `escapeHtml`, `copyToClipboard`, `downloadTextFile`) and after `panel.js` (report is triggered from panel events), but before `picker.js` and `main.js` (which are the entry points and do not depend on report).

**Note:** Step 3 also mentions adding to manifest — in practice, Steps 3 and 6 will be done together as a single commit. They are separated here for conceptual clarity.

**Acceptance criteria:**
- Extension reloads without errors.
- `window.AQT.generateBugReport` is defined after page load.
- Full end-to-end flow works: start picker → click element → panel opens → click "Generate Bug Report" → file downloads → clipboard set → toast shown.

---

## File Change Summary

| File | Change type | Step |
|---|---|---|
| `extension/manifest.json` | Modify — add `"tabs"` permission, add `report.js` to js array | 1, 6 |
| `extension/background.js` | Modify — add `capture-screenshot` message handler | 1 |
| `extension/content/picker.js` | Modify — store `lastPickedElement` on pickerState | 2 |
| `extension/content/report.js` | New file — `generateBugReport` function | 3 |
| `extension/content/utils.js` | Modify — add `downloadTextFile`, `copyToClipboard` | 4 |
| `extension/content/panel.js` | Modify — add button to `buildPanelContent`, handler to `bindPanelEvents` | 5 |
| `extension/content/content.css` | Modify — add `.aqt-panel-copy-secondary` | 5 |

---

## Git Commit Plan (Conventional Commits)

```
feat(manifest): add tabs permission for screenshot capture
feat(background): handle capture-screenshot message
feat(picker): retain last picked element reference on pickerState
feat(report): add generateBugReport content script module
feat(utils): add downloadTextFile and copyToClipboard helpers
feat(panel): add Generate Bug Report button with download + copy flow
```

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `captureVisibleTab` fails on chrome:// or extension pages | Medium | Catch error in background handler, return `{ error }`, report.js omits screenshot section gracefully |
| Canvas CORS issues with the captured PNG | Low | The data URL from `captureVisibleTab` is same-origin with the extension — no CORS |
| `getBoundingClientRect` returns zero dimensions (hidden element) | Low | Check for zero-size box; if detected, skip highlight drawing but still embed screenshot |
| Clipboard write permission prompt on first use | Low | `navigator.clipboard` in a content script context is allowed by default on user gesture; button click is a user gesture |
| Markdown base64 image too large for some ticket systems | Low | Known limitation; document in README. Can add a "report without screenshot" variant later |

---

## Deferred (Out of Scope for v1)

- Template editor / customizable report fields
- "Open as HTML in new tab" output format
- Scrolling element into view before screenshot
- Jira / GitHub API integration (direct ticket creation)
- Multiple element selection in a single report
