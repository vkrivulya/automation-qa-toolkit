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
2. After Worker completes, mark the step `[x]` in the plan
3. Present Worker's summary (what changed, how to test) to the user
4. Stop and wait for the user's go-ahead before the next step

### Review
After all steps are marked `[x]`:
1. Invoke the **Code Reviewer** agent
2. If findings are **critical** or **major**: invoke Worker to fix them, then re-review
3. If findings are **minor** only: present them to the user for a decision
4. When review passes, mark plan Status as `Done`

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
Orchestrator → User: "Step 1 complete. Ready for Step 2?"
User → Orchestrator: "Yes"

[... steps 2–4 ...]

Orchestrator → Code Reviewer: review branch diff
Code Reviewer → Orchestrator: 1 major finding, 2 minor
Orchestrator → Worker: fix the major finding
Worker → Orchestrator: fixed
Orchestrator → Code Reviewer: re-review
Code Reviewer → Orchestrator: No issues found.
Orchestrator → User: "Feature complete. Plan marked Done."
```
