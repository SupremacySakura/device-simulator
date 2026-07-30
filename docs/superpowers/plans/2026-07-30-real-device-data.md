# Real Device Data and Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unaudited built-in device dataset with 17 source-backed profiles, add user-visible confidence metadata, and enforce dataset and geometry quality gates without breaking legacy custom devices or stable IDs.

**Architecture:** `DeviceProfile` gains an optional confidence enum so old persisted/imported profiles remain valid. System profiles carry explicit confidence while a JSON ledger stores source URLs and field-level audit detail outside runtime state. Existing validation and Vitest infrastructure enforce profile geometry, dataset integrity, source coverage, and stable references; a shared badge component renders confidence consistently in single- and multi-device views.

**Tech Stack:** React 19, TypeScript 5 strict mode, Zustand 5, WXT, Vitest 3, JSON source ledger, existing hand-written runtime validator.

## Global Constraints

- Node.js must remain at least 20.19 and pnpm must remain on major version 10.
- Do not edit or commit `.output/` or `.wxt/` generated files.
- Keep `DeviceProfile` as the single runtime model; only the approved optional confidence field may be added.
- Collect device facts only from public internet sources; never infer CSS viewport by dividing physical resolution by a guessed DPR.
- Preserve existing semantic IDs: `iphone-se-3rd-generation`, `iphone-15`, `iphone-15-pro`, `iphone-15-pro-max`, `google-pixel-8`, `samsung-galaxy-s24`, `ipad-mini`, `ipad-pro-11`, `desktop-1280x720`, and `desktop-1440x900`.
- Keep source records out of Zustand state, browser storage, and import/export envelopes.
- Normalize every custom device to `unverified`; the editor does not expose confidence editing in V1.
- Use single quotes, semicolons, trailing commas, two-space indentation, and a 100-character line width.
- Follow strict red-green-refactor: no production change before its focused test fails for the expected reason.
- Do not stage or commit changes unless the user separately requests it; use diff review checkpoints instead.

---

### Task 1: Confidence Model and Legacy Compatibility

**Files:**

- Modify: `types/device.ts`
- Modify: `utils/device-profile.ts`
- Modify: `stores/device-store.ts`
- Modify: `utils/validation.ts`
- Modify: `tests/device-profile.test.ts`
- Modify: `tests/device-validation.test.ts`
- Modify: `tests/import-export.test.ts`

**Interfaces:**

- Produces: `DeviceConfidence = 'high' | 'medium' | 'low' | 'unverified'`
- Produces: optional `DeviceProfile.confidence?: DeviceConfidence`
- Produces: `getDeviceConfidence(profile: DeviceProfile): DeviceConfidence`
- Guarantees: copied, newly added, hydrated, replaced, and imported custom profiles are `unverified`
- Preserves: profiles missing `confidence` remain valid at the import and persistence boundary

- [ ] **Step 1: Write failing confidence and compatibility tests**

Add these behaviors to `tests/device-profile.test.ts`:

```ts
it('treats a legacy profile without confidence as unverified', () => {
  const profile = getDevice('iphone-15-pro');
  delete profile.confidence;

  expect(getDeviceConfidence(profile)).toBe('unverified');
});

it('removes inherited trust when a system profile is copied as custom', () => {
  const source = getDevice('iphone-15-pro');
  source.confidence = 'high';

  const copy = copyDeviceAsCustom(source, { id: 'custom-copy', now: 1 });

  expect(copy.confidence).toBe('unverified');
});
```

Add to `tests/device-validation.test.ts`:

```ts
it('rejects an unknown confidence value but accepts a missing legacy value', () => {
  const legacy = getDevice('iphone-15-pro');
  delete legacy.confidence;
  expect(validateDeviceProfile(legacy).success).toBe(true);

  const invalid = getDevice('iphone-15-pro');
  (invalid as unknown as { confidence: string }).confidence = 'trusted';
  const result = validateDeviceProfile(invalid);
  expect(result.success).toBe(false);
  if (result.success) throw new Error('Expected confidence validation to fail.');
  expect(result.issues).toContainEqual(
    expect.objectContaining({ path: '$.confidence', code: 'enum' }),
  );
});
```

Extend `tests/import-export.test.ts` with a legacy JSON fixture that omits confidence and assert the imported custom result has `confidence: 'unverified'`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm test tests/device-profile.test.ts tests/device-validation.test.ts tests/import-export.test.ts
```

Expected: failures because `DeviceProfile.confidence`, `getDeviceConfidence`, and custom normalization do not exist.

- [ ] **Step 3: Add the optional model field and normalization**

Add to `types/device.ts`:

```ts
export type DeviceConfidence = 'high' | 'medium' | 'low' | 'unverified';
```

Add `confidence?: DeviceConfidence` after `devicePixelRatio` in `DeviceProfile`.

Add to `utils/device-profile.ts`:

```ts
export function getDeviceConfidence(profile: DeviceProfile): DeviceConfidence {
  return profile.confidence ?? 'unverified';
}
```

Set `confidence: 'unverified'` in the object returned by `copyDeviceAsCustom`. In `stores/device-store.ts`, set the same value on all non-system devices in `mergeDevices`, `addDevice`, `updateDevice`, and `replaceCustomDevices`. Keep explicit confidence only for `isSystem=true` profiles.

In `utils/validation.ts`, validate the field only when it is present:

```ts
const DEVICE_CONFIDENCES = ['high', 'medium', 'low', 'unverified'] as const;

if (value.confidence !== undefined) {
  validateEnum(value.confidence, `${path}.confidence`, issues, DEVICE_CONFIDENCES);
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same focused command. Expected: all selected files pass with no warnings.

- [ ] **Step 5: Review the task diff**

Run:

```bash
git diff --check
git diff -- types/device.ts utils/device-profile.ts stores/device-store.ts utils/validation.ts tests/device-profile.test.ts tests/device-validation.test.ts tests/import-export.test.ts
```

Confirm that no storage or import schema version was changed.

---

### Task 2: Profile Geometry and Range Validation

**Files:**

- Modify: `utils/validation.ts`
- Reuse: `utils/camera-position.ts`
- Modify: `tests/device-validation.test.ts`

**Interfaces:**

- Consumes: `getCameraBounds(camera, viewport)` from `utils/camera-position.ts`
- Produces: profile limits of viewport `0 < size <= 4000` and DPR `0.5 <= DPR <= 5`
- Produces: Safe Area sum, screen radius, camera AABB, and display-feature AABB validation issues
- Preserves: precise issue paths under `$.portrait` and `$.landscape`

- [ ] **Step 1: Write one failing test per geometry break**

Add table-driven cases to `tests/device-validation.test.ts` for these mutations:

```ts
it.each([
  [
    'viewport width',
    (profile: DeviceProfile) => (profile.portrait.width = 4001),
    '$.portrait.width',
  ],
  ['DPR', (profile: DeviceProfile) => (profile.devicePixelRatio = 5.1), '$.devicePixelRatio'],
  [
    'vertical safe area sum',
    (profile: DeviceProfile) => {
      profile.portrait.safeArea.top = 500;
      profile.portrait.safeArea.bottom = 500;
    },
    '$.portrait.safeArea',
  ],
  [
    'screen radius',
    (profile: DeviceProfile) => (profile.portrait.screenBorderRadius = 197),
    '$.portrait.screenBorderRadius',
  ],
])('rejects an out-of-range %s', (_label, mutate, path) => {
  const profile = getDevice('iphone-15-pro');
  mutate(profile);
  const result = validateDeviceProfile(profile);
  expect(result.success).toBe(false);
  if (result.success) throw new Error('Expected range validation to fail.');
  expect(result.issues).toContainEqual(expect.objectContaining({ path }));
});
```

Add separate cases that move an absolute camera to `x=-1`, a right-anchored camera beyond the viewport, and a display feature so `x + width > viewport.width`. Each must assert the exact camera or feature path and an `out_of_bounds` code.

- [ ] **Step 2: Run the validation test and verify RED**

Run:

```bash
pnpm test tests/device-validation.test.ts
```

Expected: the new cases fail because current validation only checks positivity and finiteness.

- [ ] **Step 3: Implement minimal cross-field validation**

Add constants and helpers inside `utils/validation.ts`:

```ts
const MAX_VIEWPORT_SIZE = 4000;
const MIN_DEVICE_PIXEL_RATIO = 0.5;
const MAX_DEVICE_PIXEL_RATIO = 5;

interface AxisAlignedBounds {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

function rotatedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
): AxisAlignedBounds {
  const radians = (rotation * Math.PI) / 180;
  const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return {
    x: centerX - rotatedWidth / 2,
    y: centerY - rotatedHeight / 2,
    right: centerX + rotatedWidth / 2,
    bottom: centerY + rotatedHeight / 2,
  };
}
```

Validate cross-field rules only after the relevant scalar fields and arrays are structurally valid. Use `getCameraBounds` before applying rotation. Add a single issue at the object path when an AABB crosses the viewport. Safe Area sums must be strictly smaller than their corresponding dimension.

- [ ] **Step 4: Run validation tests and full unit tests**

Run:

```bash
pnpm test tests/device-validation.test.ts tests/camera-position.test.ts
pnpm test
```

Expected: both focused and full suites pass. If existing system fixtures fail, correct their invalid visual coordinates only after adding a regression case for that boundary.

- [ ] **Step 5: Review the task diff**

Run `git diff --check` and inspect only `utils/validation.ts` and `tests/device-validation.test.ts`.

---

### Task 3: Source-Backed System Dataset and Audit Ledger

**Files:**

- Modify: `constants/default-devices.ts`
- Create: `constants/device-sources.json`
- Create: `tests/system-devices.test.ts`
- Modify: `components/compare/CompareWorkspace.tsx` only if a hard-coded preset references a removed ID; no current ID should be removed

**Interfaces:**

- Preserves: `DEFAULT_DEVICES`, `SYSTEM_DEVICES: DeviceProfile[]`, and `DEFAULT_DEVICE_ID`
- Produces: exactly 17 system profiles and exactly 17 audit records
- Produces: 13 P0 IDs, 2 supplemental IDs, and 2 reference viewport IDs
- Consumes: public source URLs listed below; the JSON ledger never enters runtime state

**Exact runtime data matrix:**

| ID                         | Portrait / landscape | DPR   | Safe Area and visual facts                                        |
| -------------------------- | -------------------- | ----- | ----------------------------------------------------------------- |
| `iphone-se-3rd-generation` | 375×667 / 667×375    | 2     | both Safe Areas zero; no camera/features                          |
| `iphone-14`                | 390×844 / 844×390    | 3     | P 47/0/34/0; L 0/47/21/47; P notch 114,0,162×34                   |
| `iphone-15`                | 393×852 / 852×393    | 3     | P 59/0/34/0; L 0/59/21/59; P pill 134,11,125×37,r19               |
| `iphone-15-pro`            | 393×852 / 852×393    | 3     | same verified viewport/Safe Area/cutout as iPhone 15              |
| `iphone-15-pro-max`        | 430×932 / 932×430    | 3     | P 59/0/34/0; L 0/59/21/59; P pill 153,11,125×37,r19               |
| `iphone-16-pro`            | 402×874 / 874×402    | 3     | P 62/0/34/0; L 0/62/21/62; P pill 139,14,125×37,r19               |
| `google-pixel-8`           | 412×915 / 915×412    | 2.625 | P 50/0/0/0, cutout 182,0,46×50; L 0/50/0/0                        |
| `google-pixel-8-pro`       | 448×997 / 997×448    | 3     | P 50/0/0/0, cutout 205,0,37×50; L 0/50/0/0                        |
| `google-pixel-9`           | 412×924 / 924×412    | 2.625 | P 58/0/0/0, cutout 188,0,37×58; L 0/58/0/0                        |
| `samsung-galaxy-s24`       | 360×780 / 780×360    | 3     | medium confidence; neutral Safe Area fallback; no camera/features |
| `ipad-air-10-9`            | 820×1180 / 1180×820  | 2     | medium confidence; neutral Safe Area; no camera/features          |
| `ipad-pro-11`              | 834×1194 / 1194×834  | 2     | medium confidence; neutral Safe Area; no camera/features          |
| `surface-pro-7`            | 912×1368 / 1368×912  | 2     | zero Safe Area; no camera/features                                |
| `surface-duo-spanned`      | 1114×720 / 720×1114  | 2.5   | P hinge 540,0,34×720; L hinge 0,540,720×34                        |
| `ipad-mini`                | 744×1133 / 1133×744  | 2     | medium confidence; neutral Safe Area; no camera/features          |
| `desktop-1280x720`         | 1280×720 / 1280×720  | 1     | product reference; zero Safe Area                                 |
| `desktop-1440x900`         | 1440×900 / 1440×900  | 1     | product reference; zero Safe Area                                 |

Safe Area order in the table is `top/right/bottom/left`. “Neutral” means `{ top: 0, right: 0, bottom: 0, left: 0 }` as a non-obstructing product fallback, not a device fact; the ledger must name the four paths in `estimatedFields`. Keep category-level frame visuals, but state in every record that frame and screen radius are product presentation values excluded from device-fact confidence.

**Required source groups:**

```text
Chrome device definitions:
https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts

Apple logical dimensions:
https://developer.apple.com/design/human-interface-guidelines/layout

Pixel physical cross-checks:
https://store.google.com/product/pixel_8_specs?hl=en-US
https://store.google.com/product/pixel_8_pro_specs?hl=en-US
https://store.google.com/us/product/pixel_9_specs?hl=en-US

Galaxy S24 core cross-checks:
https://github.com/microsoft/playwright/pull/37125
https://www.samsung.com/us/support/answer/ANS00087902/

Microsoft cross-checks:
https://support.microsoft.com/en-us/surface/models/surface-pro-7-specs-and-features
https://support.microsoft.com/en-us/surface/models/surface-duo-1st-gen-features-and-specs

Product scope and reference viewports:
https://my.feishu.cn/docx/TZEbdPRa8oP6E1xZzc6cCsO8nqh
```

- [ ] **Step 1: Write the failing system dataset test**

Create `tests/system-devices.test.ts` with literal expected IDs:

```ts
const P0_IDS = [
  'iphone-se-3rd-generation',
  'iphone-14',
  'iphone-15-pro',
  'iphone-15-pro-max',
  'iphone-16-pro',
  'google-pixel-8',
  'google-pixel-8-pro',
  'google-pixel-9',
  'samsung-galaxy-s24',
  'ipad-air-10-9',
  'ipad-pro-11',
  'surface-pro-7',
  'surface-duo-spanned',
] as const;

const EXPECTED_SYSTEM_IDS = [
  ...P0_IDS,
  'iphone-15',
  'ipad-mini',
  'desktop-1280x720',
  'desktop-1440x900',
] as const;
```

Test exact set equality, `validateDeviceProfile` success for every item, top-level uniqueness, explicit confidence, audit key/ID/confidence equality, valid dates/URLs, source coverage, semantic uniqueness, orientation rules, Duo hinge bounds, and resolution of every preset ID. Export the existing constant from `CompareWorkspace` as `export const DEVICE_PRESETS` so the test exercises the actual production list.

- [ ] **Step 2: Run the system test and verify RED**

Run:

```bash
pnpm test tests/system-devices.test.ts
```

Expected: failure because the ledger and seven new P0 profiles do not exist.

- [ ] **Step 3: Replace unaudited device facts and add missing profiles**

Keep the array in `constants/default-devices.ts`. Introduce local factory functions only for repeated frame styling and verified cutout objects; do not create a remote loader or generated file. Set `isSystem: true`, `favorite` only on the current recommended profiles, stable timestamps of `0`, full `brand/model/tags`, and the exact confidence matrix from the approved design.

Use `rounded-rect` for the iPhone 14 notch approximation and record that approximation. Use absolute positions for Chrome cutout bounding boxes. Do not create horizontal camera objects when Chrome supplies only horizontal Safe Area.

- [ ] **Step 4: Create the complete audit ledger**

Create `constants/device-sources.json` with 17 keys. Each record must contain:

```json
{
  "deviceId": "google-pixel-8",
  "kind": "device",
  "priority": "P0",
  "sourceUrls": [
    "https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts",
    "https://store.google.com/product/pixel_8_specs?hl=en-US"
  ],
  "collectedAt": "2026-07-30",
  "confidence": "high",
  "estimatedFields": [],
  "crossValidated": true,
  "notes": "Chrome Android preset does not yet model the bottom navigation-bar safe area; frame and screen radius are product visuals."
}
```

For S24 and the three iPad viewport classes, use `medium`, enumerate the four neutral Safe Area field paths for both orientations in `estimatedFields`, and explain why no camera/display feature is drawn. For desktop references use `kind: 'reference'`, `priority: 'reference'`, and state that confidence applies to the product-defined viewport, not hardware.

- [ ] **Step 5: Run dataset and regression tests**

Run:

```bash
pnpm test tests/system-devices.test.ts tests/device-profile.test.ts tests/compare-store.test.ts
pnpm test
```

Expected: all tests pass; the system dataset count is 17 and all existing stable IDs resolve.

- [ ] **Step 6: Review the data diff against the matrix and sources**

Run `git diff --check`, inspect both data files in full, and manually count 17 runtime entries and 17 source records. Confirm no P1 domestic device was inferred from physical pixels.

---

### Task 4: Confidence UI, Foldable Discovery, and Capability Copy

**Files:**

- Create: `utils/device-confidence.ts`
- Create: `components/device/DeviceConfidenceBadge.tsx`
- Create: `tests/device-confidence.test.ts`
- Modify: `components/device/DeviceCategoryTabs.tsx`
- Modify: `components/device/DeviceListItem.tsx`
- Modify: `components/compare/CompareDeviceLibrary.tsx`
- Modify: `components/device/DevicePropertyPanel.tsx`
- Modify: `components/editor/SafeAreaEditor.tsx`
- Modify: `components/compare/ComparePropertyPanel.tsx`

**Interfaces:**

- Consumes: optional `DeviceProfile.confidence`
- Produces: `getDeviceConfidencePresentation(value?: DeviceConfidence)` returning label and tone
- Produces: reusable `<DeviceConfidenceBadge confidence={device.confidence} compact />`
- Produces: exported `DEVICE_CATEGORY_TABS` containing `foldable`

- [ ] **Step 1: Write failing presentation and category tests**

Create `tests/device-confidence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEVICE_CATEGORY_TABS } from '../components/device/DeviceCategoryTabs';
import { getDeviceConfidencePresentation } from '../utils/device-confidence';

describe('device confidence presentation', () => {
  it.each([
    ['high', '高可信', 'success'],
    ['medium', '中可信', 'warning'],
    ['low', '低可信', 'danger'],
    ['unverified', '未验证', 'neutral'],
    [undefined, '未验证', 'neutral'],
  ] as const)('maps %s to visible copy and tone', (value, label, tone) => {
    expect(getDeviceConfidencePresentation(value)).toEqual({ label, tone });
  });

  it('offers a foldable category without changing existing category IDs', () => {
    expect(DEVICE_CATEGORY_TABS.map((item) => item.id)).toEqual([
      'all',
      'phone',
      'tablet',
      'foldable',
      'desktop',
      'custom',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run `pnpm test tests/device-confidence.test.ts`. Expected: module/export-not-found failures.

- [ ] **Step 3: Implement the pure presentation mapping and badge**

Create `utils/device-confidence.ts` with a total mapping:

```ts
export type DeviceConfidenceTone = 'success' | 'warning' | 'danger' | 'neutral';

const PRESENTATION = {
  high: { label: '高可信', tone: 'success' },
  medium: { label: '中可信', tone: 'warning' },
  low: { label: '低可信', tone: 'danger' },
  unverified: { label: '未验证', tone: 'neutral' },
} as const;

export function getDeviceConfidencePresentation(confidence?: DeviceConfidence) {
  return PRESENTATION[confidence ?? 'unverified'];
}
```

Create `DeviceConfidenceBadge.tsx` with fixed tone classes: green for success, amber for warning, red for danger, gray for neutral. The badge text must always remain visible; color alone is insufficient.

- [ ] **Step 4: Add the badge and capability copy to all approved surfaces**

Add the badge beside the device name in `DeviceListItem`, below the title in each compare library item, and as an `InfoRow` in `DevicePropertyPanel`. Rename the size label to `CSS 视口` and DPR label to `设备像素比（元数据）`; add one sentence that DPR/UA do not change the iframe environment or request.

Change `SafeAreaEditor` copy to:

```text
当前方向，单位为 CSS px；仅用于视觉覆盖，不等同于页面内 env()。
```

Add the same one-sentence limitation below the compare property panel Safe Area toggle group. Export the category array as `DEVICE_CATEGORY_TABS` and insert `{ id: 'foldable', label: '折叠屏' }` between tablet and desktop.

- [ ] **Step 5: Run focused tests, typecheck, and lint**

Run:

```bash
pnpm test tests/device-confidence.test.ts
pnpm typecheck
pnpm lint
```

Expected: zero failures and no accessibility or unused-export lint errors.

- [ ] **Step 6: Review the UI diff**

Inspect the changed components and verify both single- and multi-device libraries consume the same badge rather than duplicating mappings.

---

### Task 5: Documentation, Full Verification, and Handoff

**Files:**

- Create: `docs/device-data-changelog.md`
- Modify: `README.md`
- Verify: all files changed by Tasks 1–4

**Interfaces:**

- Documents: 17 system entries, 13 P0 devices, confidence semantics, source-ledger location, and simulation limitations
- Records: stable IDs, corrected device fields, added profiles, S24/iPad medium-confidence limitations, and collection date

- [ ] **Step 1: Write the device data changelog**

Create `docs/device-data-changelog.md` with a `2026-07-30` entry containing these explicit groups:

```text
Added: iPhone 14, iPhone 16 Pro, Pixel 8 Pro, Pixel 9, iPad Air 10.9-inch viewport class, Surface Pro 7, Surface Duo（双屏展开态）.
Corrected: iPhone SE Safe Area, iPhone 15 Pro island width, Pixel 8 Safe Area/cutout, iPad names and unsupported visual layers.
Preserved IDs: all ten pre-existing system IDs.
Known limits: S24 and iPad visual fields are medium confidence; Android bottom navigation Safe Area is not fully modeled; DPR and UA remain metadata.
```

Link to `constants/device-sources.json` rather than duplicating all URLs.

- [ ] **Step 2: Update README user-facing facts**

Change the system preset count from 10 to 17, describe the confidence badges, add foldable filtering, and state:

```text
设备尺寸是 CSS 视口。DPR 和 UA 是配置元数据，不会改变 iframe 的真实环境或网络请求；Safe Area 仅为外部视觉覆盖层，不会注入标准 CSS env()。
```

- [ ] **Step 3: Run formatting and inspect changes**

Run:

```bash
pnpm format
git diff --check
git status --short
```

Review formatter changes and ensure it did not touch generated directories or unrelated user files.

- [ ] **Step 4: Run the full completion gate**

Run fresh commands in this order:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Record exact test counts and exit codes. Do not claim completion if any command fails.

- [ ] **Step 5: Perform the requirements audit**

Re-read the approved design and verify each acceptance item against the diff: 13 P0 IDs, 17 system/source records, S24 medium confidence, visible badges, foldable Tab, source audit, old custom compatibility, stable IDs, geometry tests, capability copy, and unchanged import/storage schema versions.

- [ ] **Step 6: Prepare the handoff**

Summarize changed files, source/data decisions, exact verification evidence, and remaining internet-evidence limitations. Do not stage or commit unless the user separately asks.
