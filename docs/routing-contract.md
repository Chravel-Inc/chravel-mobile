# Routing contract: native shell, PWA, and browser auth bootstrap

This document defines the strict startup routing behavior across native shell and web so channel behavior remains deterministic.

## Contract

1. **Native shell launch target is fixed to `/auth?app_context=native`.**
   - In this repo, use `buildNativeAuthLaunchUrl()` from `src/deepLinking.ts` as the single source of truth.
2. **Web auth/bootstrap must branch in this exact order:**
   - If `app_context=native` **or** `window.ChravelNative?.isNative` is true → open auth modal immediately.
   - Else if installed PWA context is true → open auth modal immediately.
   - Else (plain browser on desktop/mobile) → show marketing page first.
3. **Web repo must use one shared context helper** (consumed by auth/bootstrap pages/components) so detection logic cannot drift.
4. **Do not keep parallel redirect branches** that compete with the contract above (especially PWA-era one-off redirects).

## Why this exists

Without one deterministic contract, startup can diverge by channel:
- Native users can briefly hit marketing before auth.
- PWA users can get stuck in browser-first behavior.
- Browser users can be incorrectly forced into auth-first.

## Implementation notes

- Mobile shell is responsible for setting explicit native intent via `app_context=native`.
- Web app is responsible for channel detection and auth/marketing decisioning.
- Any change to auth bootstrap should update this doc in the same PR.
