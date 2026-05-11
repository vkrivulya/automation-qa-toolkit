# Project Brief

## Name
Automation QA Toolkit — Chrome Extension

## Goal
A Chrome browser extension that helps QA engineers automate routine manual testing work. The first module is a **Selector Manager**: pick any element on a page and instantly get stable, framework-ready test selectors.

## Core Requirements

### Selector Manager (implemented)
- Element picker mode with visual hover highlight
- Generate selectors in multiple strategies: data-* attributes, id, aria-label, text-based, context-based, XPath
- Stability rating for each selector (stable / medium / weak)
- Output formatted for 6 test frameworks: Selenide, Selenium, WebdriverIO, Playwright, Cypress, Robot Framework
- Language variants: Java, Python, TypeScript, SeleniumLibrary, Browser Library
- Floating draggable panel showing results with copy buttons
- Alternative selectors when primary is dynamic or unstable
- Handle special cases: Ant Design components, SVG elements, dynamic IDs, composite controls

### Planned Modules
- Bug Report Generator — capture element, screenshot, and context into a structured report
- AI Selector Suggestions — suggest better selectors using AI when none are stable

## Coding Style
- Vanilla JavaScript (no build step, no bundler)
- Chrome Extension Manifest V3
- Modular files loaded as content scripts in order: utils.js → selectors.js → panel.js → picker.js → main.js
- No frameworks, no npm packages — pure browser APIs
- No comments unless the WHY is non-obvious

## Timeline
Active development. No fixed deadline. Iterative feature additions by a solo QA engineer.
