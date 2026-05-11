# Product Context

## Purpose
QA engineers spend significant time manually inspecting elements in DevTools to write test selectors. This extension eliminates that friction: hover over an element, click, and get production-ready selector code you can paste directly into your test file.

## Target Users
- QA automation engineers (primary)
- Manual QA engineers transitioning to automation
- Developers writing their own tests

The primary user is someone who knows test frameworks but wants to skip the selector-writing ceremony.

## Problem Statement
1. Writing stable selectors by hand is slow and error-prone — engineers often pick fragile selectors (position-based, auto-generated IDs) without realizing it
2. Switching between frameworks requires remembering different syntax (CSS vs XPath vs framework DSL)
3. Modern UI libraries (Ant Design, etc.) generate complex DOM structures where the visible element is not the right target to select

## UX Goals
- **Zero friction**: one click in the toolbar, one click on the element — done
- **Confidence**: stability rating tells you immediately if a selector will break
- **Framework-aware**: output is ready to paste, not just a raw CSS string
- **Non-intrusive**: the floating panel stays out of the way and doesn't interfere with page behavior
- **Recoverable**: if the picked element gives poor selectors, alternatives are shown

## Success Metrics (qualitative)
- QA engineer can write a complete test selector in under 10 seconds
- Selectors generated for Ant Design components are actually usable
- The extension does not break or interfere with the pages it runs on
