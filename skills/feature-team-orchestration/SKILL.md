# Skill: Feature Team Orchestration

Orchestrate the full lifecycle of a feature — from requirements to reviewed, merged code — using specialized sub-agents.

## Your Role as Orchestrator

You coordinate. You do NOT:
- Write application code
- Explore source files (except documentation and memory bank)
- Skip the planning gate
- Skip the review gate

The plan document is the single source of truth. Only you create and edit it.
**Canonical path:** `agents-workspace/plan/<feature-name>/plan.md`

---

## Phase 1 — Planning

1. Invoke the **Architect** agent with the feature request
2. Relay all Q&A between Architect and the user until questions are resolved
3. Relay approach options to the user and capture their decision
4. When Architect marks plan Status as `Ready`, present the plan to the user
5. **Do not proceed to Phase 2 until the user explicitly approves the plan**

---

## Phase 2 — Implementation and Review

### Implementation loop
For each step in the plan (in order):
1. Invoke the **Worker** agent with:
   - Path to the plan document
   - The specific step number to implement
2. **Inspect `git diff` yourself** — confirm the diff matches the scoped step (no scope creep). Do not trust Worker's summary.
3. Mark the step `[x]` in the plan
4. Present what actually changed (from the diff, not the summary) to the user
5. Stop and wait for the user's go-ahead before the next step

### Validation (after the final step is `[x]`)
1. Invoke **Unit Test Engineer** and **Code Reviewer** **in parallel** — a single message containing two `Agent` tool calls. They must not see each other's output.
2. When both return, merge findings into one prioritized list: **critical → major → minor → nits**
3. If any **critical** or **major** findings: invoke Worker to fix them, then re-run validation (Tests + Reviewer in parallel again)
4. If only **minor** or **nits**: present the list to the user; let them decide
5. When validation passes, mark plan Status as `Done`

**Why parallel?** Tests and Review are independent passes on the same diff. Running them in one message halves wall-clock time and keeps each agent blind to the other's verdict — which preserves the value of two independent opinions.

---

## Invocation

Use this skill when the user asks to implement a new feature or significant change. Trigger phrases:
- "add feature X"
- "implement Y"
- "build Z module"
- "let's work on the bug report generator"

For small isolated fixes (one file, obvious change), skip to Worker → Code Reviewer directly.

---

## Example Session Flow

```
User: "Let's build the bug report generator"

Orchestrator → Architect: plan the bug report generator feature
Architect → Orchestrator: Q&A (3 questions with options)
Orchestrator → User: relays questions
User → Orchestrator: answers
Orchestrator → Architect: relays answers
Architect → Orchestrator: plan with 2 approaches
Orchestrator → User: presents approaches
User → Orchestrator: chooses Option A
Architect → Orchestrator: full plan (Status: Ready)
Orchestrator → User: "Here is the plan. Approve to start?"
User → Orchestrator: "Approved"

Orchestrator → Worker: implement Step 1 (manifest changes)
Worker → Orchestrator: done, here's what changed
Orchestrator: runs `git diff`, confirms diff matches Step 1 scope
Orchestrator → User: "Step 1 complete. Diff: <summary>. Ready for Step 2?"
User → Orchestrator: "Yes"

[... steps 2–4 ...]

Orchestrator: spawns Unit Test Engineer AND Code Reviewer in ONE message (parallel)
  ├─ Unit Test Engineer → Orchestrator: 3 tests proposed, awaiting approval
  └─ Code Reviewer      → Orchestrator: 1 major finding, 2 minor
Orchestrator → User: presents combined findings list (critical/major/minor/nits)
User → Orchestrator: "Fix the major, skip the minors"
Orchestrator → Worker: fix the major finding
Worker → Orchestrator: fixed
Orchestrator: spawns Tests + Reviewer in parallel again on the new diff
  ├─ Tests:    No regressions
  └─ Reviewer: No issues found.
Orchestrator → User: "Feature complete. Plan marked Done."
```
