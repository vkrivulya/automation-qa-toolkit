# Skill: Change Impact Analysis

Analyze the semantic impact of a diff or branch before merging. Answer: **what behavior changed, who depends on it, and how risky is this merge?**

## When to Use
- Before merging a PR
- When a change touches `selectors.js` (the core engine — many consumers)
- When a change modifies `window.AQT` public API
- When a change touches `manifest.json` or content script load order

---

## Workflow

### Step 1 — Extract Semantic Changes
Run `git diff main` and identify **what behavior changed**, not what files changed.

Classify each change:
| Type | Examples |
|---|---|
| Public API | Added/removed/renamed function on `window.AQT` |
| Selector logic | Changed how candidates are scored or ranked |
| Framework output | Changed generated code format for a framework |
| DOM interaction | Changed how picker finds/highlights elements |
| Panel UI | Changed how results are displayed |
| Storage | Changed keys or format of `chrome.storage.local` |
| Manifest | Changed permissions, script order, or CSP |
| Dependency | N/A (no npm) |

### Step 2 — Trace Consumers
For each semantic change, identify what depends on it:
- Which files call the changed function?
- Which content scripts rely on the changed load order?
- Which popup settings affect the changed output?
- Which Ant Design / SVG paths are affected?

### Step 3 — Score Impact

**Blast Radius (1–10):** How many things could break?
- 1–3: isolated change, one file, no shared API
- 4–6: changes shared utility or one framework output
- 7–9: changes core selector logic, affects all frameworks
- 10: changes `window.AQT` API or manifest

**Importance (low / medium / high / critical):** How much developer attention is needed?
- `low`: safe, well-contained, easy to verify
- `medium`: warrants manual testing on a real page
- `high`: needs testing across multiple frameworks/languages
- `critical`: touches Ant Design detection, dynamic ID logic, or selector ranking — full regression needed

---

## Output Format

### Top Changes (max 5)
For each significant change, 3–4 sentences covering: what changed semantically, what depends on it, and the risk.

### Supporting Evidence
```
Change: <name>
File: <path:line>
Symbol: <function or variable name>
Consumers: <files or code paths that depend on this>
```

### Full Change Table
| Change | Description | Blast Radius (1–10) | Importance |
|---|---|---|---|
| ... | ... | ... | ... |

---

## Rules
- Analyze semantics, not file lists — "changed stability scoring for class-based selectors" not "modified selectors.js"
- Always trace at least one consumer per change
- Distinguish blast radius (breadth) from importance (depth of review needed)
- Flag any change to `window.AQT` public surface as at least `high` importance
