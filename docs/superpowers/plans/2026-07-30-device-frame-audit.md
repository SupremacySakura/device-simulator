# Device Frame Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every remaining category-level device frame template with per-profile, source-backed housing geometry and honest confidence metadata.

**Architecture:** Treat `frame.insets` as portrait housing-to-active-display geometry and rotate it with the physical device for landscape rendering. Keep CSS colors, shadows, button art, and border radii explicitly approximate where manufacturers do not publish full engineering drawings. Preserve the two generic desktop presets as product reference windows rather than claiming they model hardware.

**Tech Stack:** React 19, TypeScript 5.8, WXT, Vitest, JSON source ledger.

## Global Constraints

- Use only public Internet sources; prefer Apple dimensional drawings and manufacturer support/specification pages.
- Do not introduce a remote runtime data loader.
- Use source-derived literal fixtures in tests; do not calculate expected values with production helpers.
- Do not stage or commit changes unless the user asks.
- Do not edit generated `.output/` or `.wxt/` files.

---

### Task 1: Rotate portrait housing insets in landscape

**Files:**

- Modify: `utils/device-profile.ts`
- Modify: `utils/instance-size.ts`
- Modify: `components/simulator/DevicePreview.tsx`
- Modify: `components/simulator/DeviceFrame.tsx`
- Modify: `components/simulator/DeviceCanvas.tsx`
- Test: `tests/instance-size.test.ts`
- Test: `tests/device-profile.test.ts`

**Interfaces:**

- Produce: `getDeviceFrameInsets(profile, orientation): DeviceFrameInsets`
- Consume: the helper in every layout and rendering path that reads `profile.frame.insets`.

- [x] Add a failing test showing portrait `{ top: 2, right: 3, bottom: 4, left: 5 }` becomes landscape `{ top: 5, right: 2, bottom: 3, left: 4 }`.
- [x] Run `pnpm test -- tests/device-profile.test.ts tests/instance-size.test.ts` and confirm the old unrotated behavior fails.
- [x] Implement the pure rotation helper and use it for outer-size calculation, preview layout, frame padding, ruler offsets, and auto-scale dimensions.
- [x] Re-run the focused tests and confirm they pass.

### Task 2: Replace every remaining physical-device template

**Files:**

- Modify: `constants/default-devices.ts`
- Test: `tests/system-devices.test.ts`

**Interfaces:**

- Consume: portrait-oriented `DeviceFrameInsets` from Task 1.
- Produce: one explicit source-calibrated frame for every physical system profile.

- [x] Add failing literal outer-size tests for iPhone SE, Pixel 8, Pixel 8 Pro, Pixel 9, Galaxy S24, iPad Air 5, iPad Pro 11 (4th generation), iPad mini 6, Surface Pro 7, and Surface Duo open/spanned.
- [x] Add a failing assertion that no physical profile uses the old `12/12/12/12 + 2` phone frame or `14/14/14/14 + 2` tablet frame.
- [x] Implement Apple engineering-drawing values: SE totals `110/28/110/28`, Air totals `52` all around, Pro totals `45`, mini totals `56`.
- [x] Implement manufacturer-spec-derived totals: Pixel 8 `23/20/23/20`, Pixel 8 Pro `24/22/24/22`, Pixel 9 `21/22/21/22`, S24 `11/13/11/13`, Surface Pro 7 `84/73/84/73`, Surface Duo `98/33/98/33`.
- [x] Keep the five already corrected modern iPhones unchanged and keep desktop reference-window frames explicitly generic.
- [x] Re-run `pnpm test -- tests/system-devices.test.ts` and confirm it passes.

### Task 3: Make provenance and uncertainty match the implementation

**Files:**

- Modify: `constants/device-sources.json`
- Modify: `README.md`
- Modify: `docs/device-data-changelog.md`
- Test: `tests/system-devices.test.ts`

**Interfaces:**

- Produce: source URLs, derivation notes, and confidence values aligned with frame evidence.

- [x] Add Apple drawing URLs and Google/Microsoft/Samsung official specification URLs to the required-source test.
- [x] Mark exact Apple drawing-derived frame insets as source-backed.
- [x] Mark diagonal/resolution-derived Android and Surface frame insets as estimates, including the centered-display assumption.
- [x] Downgrade Pixel and Surface profiles from `high` to `medium`, because their overall frame geometry is derived rather than directly dimensioned.
- [x] Explain that desktop entries are reference windows, not physical devices, and update documentation language that previously described all frames as generic presentation values.
- [x] Re-run the system dataset tests.

### Task 4: Full verification and cleanup

**Files:**

- Verify all changed production, test, ledger, and documentation files.

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm format:check`.
- [x] Run `pnpm build`.
- [x] Run `git diff --check` and review the final diff.
- [x] Remove `tmp/pdfs/` after the official drawing review is complete.

## Self-review

- Coverage: all 15 physical profiles are covered; the two desktop entries are explicitly treated as non-hardware references.
- Placeholder scan: the plan contains no deferred implementation placeholders.
- Type consistency: all consumers use the same `getDeviceFrameInsets` signature and existing `DeviceFrameInsets` type.
