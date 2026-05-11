# Progress

## Current Status
**Active development** — Selector Manager module is feature-complete and working. Infrastructure (orchestration, memory bank, agents) being set up.

## Completed Work

### Selector Manager (v1 — complete)
- [x] Element picker with visual hover highlight
- [x] Floating draggable panel
- [x] CSS and XPath selector generation
- [x] Stability rating (stable / medium / weak)
- [x] Framework output: Selenide, Selenium, WebdriverIO, Playwright, Cypress, Robot Framework
- [x] Language variants: Java, Python, TypeScript, SeleniumLibrary, Browser Library
- [x] Copy buttons for each selector
- [x] QA attribute priority (`data-testid`, `data-qa`, `data-cy`, etc.)
- [x] Dynamic ID detection and fallback alternatives
- [x] Ant Design composite control detection (select, datepicker, etc.)
- [x] SVG element handling
- [x] Context-based selectors (label + element)
- [x] Text-based XPath alternatives
- [x] Ancestor-based fallback selectors

### Infrastructure
- [x] CLAUDE.md orchestration setup
- [x] memory-bank/ with full project context
- [x] agents/ with specialized sub-agent definitions
- [x] skills/ with orchestration workflows

## In Progress
- Nothing currently in active development

## Pending / Planned

### Next Features (from dev-context.md)
- [ ] Bug Report Generator — capture element + screenshot + page context into structured report
- [ ] AI Selector Suggestions — use AI to suggest better selectors when none are stable

### Technical Improvements
- [ ] Unit tests for `selectors.js` (stability scoring, dynamic ID detection, framework formatting)
- [ ] E2E smoke test: load extension, pick element, verify output format

## Known Issues
- None currently tracked

## Recent Decisions
- Chose Manifest V3 (required for new Chrome extensions)
- No build step by design — keeps development fast and extension loadable directly
- `window.AQT` namespace to avoid global pollution
- Content scripts loaded in explicit order (utils → selectors → panel → picker → main)
