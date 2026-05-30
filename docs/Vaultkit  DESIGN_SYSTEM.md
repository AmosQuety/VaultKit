# VaultKit — Design System
> "Calm Infrastructure" — Fast, dense, intentional, trustworthy.
> Read this ENTIRE file before writing a single line of UI code.

---

## Philosophy

VaultKit is **workflow software**. Users come to it to get things done — upload, organize, share, approve. The UI's job is to disappear and let the work happen. Every design decision should pass this test:

> "Does this make the user feel the system is reliable and engineered well?"

If a design choice makes it feel like a flashy startup toy, remove it.

**Inspiration sources (study these, copy nothing directly):**
- Linear — density, typography hierarchy, keyboard-first
- Frame.io — asset previews, approval flows, metadata layout
- Stripe Dashboard — trust, data clarity, complex-made-simple
- Vercel — dark-first, minimal, fast-feeling
- Obsidian / Superhuman — offline awareness, sync confidence

---

## ❌ NO GRADIENTS — READ THIS FIRST

**Do not use gradients anywhere in VaultKit UI.**

This applies to both the web (React) and mobile (React Native) implementations.

**Why:**
- On React Native, gradients require `expo-linear-gradient` — an extra dependency that adds complexity, bundle size, and bugs on low-end Android devices (which are your primary users)
- Gradients are the #1 signal of "Dribbble startup syndrome" — exactly what VaultKit is not
- Solid colors with good contrast are faster to render on low-end devices
- The design system achieves depth through layered surfaces, not gradients

**What to use instead of gradients:**
```
Background depth    → layered surface colors (bg → surface → surface2)
Image placeholders  → solid muted fill + blur-hash overlay
Empty states        → subtle border + muted icon, no gradient bg
Hero sections       → typography + solid color block
Progress bars       → solid accent color on solid surface2 track
```

**The one exception:** Asset thumbnail placeholders (when no preview has loaded yet) may use a single solid muted color — `#1e2128` dark / `#e8e5de` light. Never a gradient even here.

---

## Fonts

### Typefaces
```
UI Text:   Sora (Google Fonts)
           Weights used: 300 (light), 400 (regular), 500 (medium), 600 (semibold)
           Never use 700/800 — too heavy against the surface palette

Data/Meta: IBM Plex Mono (Google Fonts)
           Weights used: 400, 500
           Used for: file sizes, hashes, version numbers, badges, labels,
                     timestamps, scopes, API keys, status codes
```

### Import (Web)
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@300;400;500;600&display=swap');
```

### Import (React Native — Expo)
```js
import * as Font from 'expo-font'

await Font.loadAsync({
  'Sora-Light':    require('./assets/fonts/Sora-Light.ttf'),
  'Sora-Regular':  require('./assets/fonts/Sora-Regular.ttf'),
  'Sora-Medium':   require('./assets/fonts/Sora-Medium.ttf'),
  'Sora-SemiBold': require('./assets/fonts/Sora-SemiBold.ttf'),
  'IBMPlexMono-Regular': require('./assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium':  require('./assets/fonts/IBMPlexMono-Medium.ttf'),
})
```

### Type Scale
| Token | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `text-display` | Sora | 28px / 28sp | 600 | 1.2 | Page titles, hero text |
| `text-title` | Sora | 18px / 18sp | 500 | 1.3 | Section titles, card headers |
| `text-heading` | Sora | 15px / 15sp | 500 | 1.4 | Sub-section headers |
| `text-body` | Sora | 13px / 13sp | 400 | 1.6 | Primary content text |
| `text-small` | Sora | 11px / 11sp | 400 | 1.5 | Secondary content, hints |
| `text-label` | IBM Plex Mono | 10px / 10sp | 400 | 1.4 | UPPERCASE section labels, only case where caps are used |
| `text-mono` | IBM Plex Mono | 12px / 12sp | 400 | 1.5 | Metadata, hashes, sizes, scopes |
| `text-mono-sm` | IBM Plex Mono | 10px / 10sp | 400 | 1.4 | Badges, status chips, tiny metadata |

### Typography Rules
- **Sentence case always.** No Title Case in UI. No ALL CAPS except `text-label`.
- **Two weights per screen max.** Don't mix 300 + 400 + 500 + 600 on one screen.
- Letter spacing: `-0.02em` on display text, `0` on body, `+0.08em` on mono labels.
- Never bold body text mid-sentence. Use color shift (muted → primary) for emphasis instead.

---

## Color System

### Dark Mode Palette (Primary)
```css
/* Backgrounds — layered surfaces create depth without gradients */
--vk-bg:          #0e0f11;   /* Page background — deepest layer */
--vk-surface:     #16181c;   /* Cards, panels, sidebars */
--vk-surface2:    #1e2128;   /* Inputs, hover states, inner rows */
--vk-surface3:    #252830;   /* Elevated tooltips, dropdowns */

/* Borders */
--vk-border:      rgba(255,255,255,0.07);   /* Default — very subtle */
--vk-border2:     rgba(255,255,255,0.13);   /* Hover / emphasis */
--vk-border3:     rgba(255,255,255,0.20);   /* Active / selected */

/* Text */
--vk-text:        #e8e9eb;   /* Primary text */
--vk-text2:       #9ca3af;   /* Secondary / muted text */
--vk-text3:       #6b7280;   /* Placeholder, hint text */

/* Accent — warm terracotta. One accent, used sparingly. */
--vk-accent:      #e8784a;
--vk-accent-dim:  rgba(232,120,74,0.12);   /* Accent backgrounds */
--vk-accent-text: #f4a07a;   /* Accent text on dark bg */

/* Semantic */
--vk-success:     #34d399;   /* Approved, synced, online */
--vk-success-dim: rgba(52,211,153,0.12);
--vk-warning:     #fbbf24;   /* Pending, queued, warning */
--vk-warning-dim: rgba(251,191,36,0.10);
--vk-danger:      #f87171;   /* Error, failed, revision */
--vk-danger-dim:  rgba(248,113,113,0.10);
--vk-info:        #4a9eff;   /* Processing, info, links */
--vk-info-dim:    rgba(74,158,255,0.10);
```

### Light Mode Palette
```css
/* Warm stone — not pure white */
--vk-bg:          #f5f4f0;
--vk-surface:     #ffffff;
--vk-surface2:    #f0ede6;
--vk-surface3:    #e8e5de;

--vk-border:      rgba(0,0,0,0.07);
--vk-border2:     rgba(0,0,0,0.13);
--vk-border3:     rgba(0,0,0,0.20);

--vk-text:        #1a1a1a;
--vk-text2:       #6b7280;
--vk-text3:       #9ca3af;

/* Accent shifts slightly warmer in light mode */
--vk-accent:      #c5522d;
--vk-accent-dim:  rgba(197,82,45,0.08);
--vk-accent-text: #c5522d;

--vk-success:     #059669;
--vk-success-dim: rgba(5,150,105,0.08);
--vk-warning:     #d97706;
--vk-warning-dim: rgba(217,119,6,0.08);
--vk-danger:      #dc2626;
--vk-danger-dim:  rgba(220,38,38,0.08);
--vk-info:        #2563eb;
--vk-info-dim:    rgba(37,99,235,0.08);
```

### React Native StyleSheet equivalents
```js
// colors.ts — import this everywhere, never hardcode hex values in components

export const colors = {
  dark: {
    bg:         '#0e0f11',
    surface:    '#16181c',
    surface2:   '#1e2128',
    surface3:   '#252830',
    border:     'rgba(255,255,255,0.07)',
    border2:    'rgba(255,255,255,0.13)',
    text:       '#e8e9eb',
    text2:      '#9ca3af',
    text3:      '#6b7280',
    accent:     '#e8784a',
    accentDim:  'rgba(232,120,74,0.12)',
    success:    '#34d399',
    successDim: 'rgba(52,211,153,0.12)',
    warning:    '#fbbf24',
    warningDim: 'rgba(251,191,36,0.10)',
    danger:     '#f87171',
    dangerDim:  'rgba(248,113,113,0.10)',
    info:       '#4a9eff',
    infoDim:    'rgba(74,158,255,0.10)',
  },
  light: {
    bg:         '#f5f4f0',
    surface:    '#ffffff',
    surface2:   '#f0ede6',
    surface3:   '#e8e5de',
    border:     'rgba(0,0,0,0.07)',
    border2:    'rgba(0,0,0,0.13)',
    text:       '#1a1a1a',
    text2:      '#6b7280',
    text3:      '#9ca3af',
    accent:     '#c5522d',
    accentDim:  'rgba(197,82,45,0.08)',
    success:    '#059669',
    successDim: 'rgba(5,150,105,0.08)',
    warning:    '#d97706',
    warningDim: 'rgba(217,119,6,0.08)',
    danger:     '#dc2626',
    dangerDim:  'rgba(220,38,38,0.08)',
    info:       '#2563eb',
    infoDim:    'rgba(37,99,235,0.08)',
  }
}
```

---

## Spacing & Layout

### Spacing Scale (use ONLY these values)
```
2px   — micro gap (icon + label in badge)
4px   — tight gap (metadata rows)
6px   — small gap (button icon + text)
8px   — default icon gap, inner padding small
12px  — component internal padding
14px  — card padding (mobile)
16px  — card padding (web), section gap small
20px  — section gap medium
24px  — section gap large
32px  — section gap XL, page-level breathing room
```

### React Native spacing
```js
export const spacing = {
  micro: 2, tight: 4, xs: 6, sm: 8,
  md: 12, card: 14, lg: 16, xl: 20,
  xxl: 24, section: 32,
}
```

### Border Radius
```
4px   — badges, chips, small pills (borderRadius: 4)
6px   — buttons, inputs, small cards (borderRadius: 6)
8px   — cards, panels (borderRadius: 8)
12px  — bottom sheets, modals (borderRadius: 12)
16px  — large modals, sheets on mobile (borderRadius: 16)
999px — circular avatars (borderRadius: 999)
```

### Border Width
```
0.5px / StyleSheet.hairlineWidth — all borders, always.
NEVER use 1px borders — they look heavy and unprofessional.
In React Native: use StyleSheet.hairlineWidth (resolves to 0.5 on most devices)
```

---

## Component Patterns

### Card
```css
/* Web */
.card {
  background: var(--vk-surface);
  border: 0.5px solid var(--vk-border);
  border-radius: 8px;
  padding: 14px;
}
```
```js
// React Native
const card = {
  backgroundColor: colors.dark.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.dark.border,
  borderRadius: 8,
  padding: 14,
}
```

### Button — Primary
```css
.btn-primary {
  background: var(--vk-accent);
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:active { opacity: 0.75; transform: scale(0.98); }
```
```js
// React Native — NO opacity animation for performance, use pressable
<Pressable
  style={({ pressed }) => ({
    backgroundColor: colors.dark.accent,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    opacity: pressed ? 0.8 : 1,
  })}
>
  <Text style={{ color: '#fff', fontFamily: 'Sora-Medium', fontSize: 13 }}>
    Upload files
  </Text>
</Pressable>
```

### Button — Secondary
```js
// React Native
{
  backgroundColor: colors.dark.surface2,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.dark.border2,
  borderRadius: 6,
  paddingVertical: 8,
  paddingHorizontal: 16,
}
```

### Button — Ghost (Destructive)
```js
{
  backgroundColor: colors.dark.dangerDim,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(248,113,113,0.20)',
  borderRadius: 6,
}
// Text color: colors.dark.danger
```

### Input
```css
/* Web */
.input {
  background: var(--vk-surface2);
  border: 0.5px solid var(--vk-border2);
  border-radius: 6px;
  padding: 9px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--vk-text);
  outline: none;
  transition: border-color 0.15s;
}
.input:focus { border-color: var(--vk-accent); }
.input::placeholder { color: var(--vk-text3); }
```
```js
// React Native
{
  backgroundColor: colors.dark.surface2,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.dark.border2,
  borderRadius: 6,
  paddingVertical: 9,
  paddingHorizontal: 12,
  fontFamily: 'Sora-Regular',
  fontSize: 13,
  color: colors.dark.text,
}
// On focus: borderColor: colors.dark.accent
```

### Badge / Status Chip
Badges always use IBM Plex Mono, lowercase, small text.
```js
// React Native badge component pattern
const badgeStyles = {
  approved: {
    backgroundColor: colors.dark.successDim,
    borderColor: 'rgba(52,211,153,0.20)',
    color: colors.dark.success,
  },
  pending: {
    backgroundColor: colors.dark.warningDim,
    borderColor: 'rgba(251,191,36,0.20)',
    color: colors.dark.warning,
  },
  revision_requested: {
    backgroundColor: colors.dark.dangerDim,
    borderColor: 'rgba(248,113,113,0.20)',
    color: colors.dark.danger,
  },
  processing: {
    backgroundColor: colors.dark.infoDim,
    borderColor: 'rgba(74,158,255,0.20)',
    color: colors.dark.info,
  },
  archived: {
    backgroundColor: colors.dark.surface2,
    borderColor: colors.dark.border2,
    color: colors.dark.text3,
  },
}

// Badge container style
const badge = {
  paddingVertical: 2,
  paddingHorizontal: 7,
  borderRadius: 4,
  borderWidth: StyleSheet.hairlineWidth,
}

// Badge text style
const badgeText = {
  fontFamily: 'IBMPlexMono-Regular',
  fontSize: 10,
}
```

### Asset Thumbnail Card
```js
// React Native — NO gradient on thumbnail placeholder
const assetCard = {
  container: {
    backgroundColor: colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 80,
    backgroundColor: colors.dark.surface2,  // solid, no gradient
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Blur-hash renders ON TOP of this solid bg as an Image component
  // once blur hash is loaded, show it; once full preview is ready, show that
  info: {
    padding: 10,
  },
  name: {
    fontFamily: 'Sora-Medium',
    fontSize: 12,
    color: colors.dark.text,
    marginBottom: 2,
  },
  meta: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 10,
    color: colors.dark.text3,
  },
}
```

### Sync Status Row (Field Mode)
```js
// The offline sync indicator — critical for field mode UX
const syncDotColors = {
  synced:    colors.dark.success,
  uploading: colors.dark.info,      // pulse animation
  queued:    colors.dark.warning,
  failed:    colors.dark.danger,
}

// Row style
const syncRow = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: colors.dark.surface2,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.dark.border,
  borderRadius: 6,
  marginBottom: 4,
}
```

### Navigation — Sidebar (Web) / Tab bar (Mobile)
```css
/* Web sidebar nav item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 5px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--vk-text3);
  cursor: pointer;
  transition: all 0.1s ease;
}
.nav-item:hover {
  background: var(--vk-surface2);
  color: var(--vk-text2);
}
.nav-item.active {
  background: var(--vk-accent-dim);
  color: var(--vk-accent-text);
}
```

### Storage Quota Bar
```js
// No gradient on the progress bar — solid accent fill
const quotaBar = {
  track: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 3,
    height: 4,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.dark.accent,
    height: 4,
    borderRadius: 3,
    // width is a percentage string based on (used / quota)
  },
  // When > 80% full, fill becomes warning color
  fillWarning: {
    backgroundColor: colors.dark.warning,
  },
  // When > 95% full, fill becomes danger color
  fillDanger: {
    backgroundColor: colors.dark.danger,
  },
}
```

---

## Motion & Animation

### Rules
- Maximum transition duration: `150ms`
- Easing: `ease` or `ease-out` — never `bounce`, never `spring` on data
- No decorative animations — every animation must communicate state
- On low-end devices (detect via `PixelRatio < 2`): disable all animations, show instant state changes

### Allowed Animations
```
Opacity fade:        100ms ease — loading states, skeleton
Scale press:         100ms — button active state (0.97 scale)
Slide-in panel:      200ms ease-out — bottom sheets, sidebars
Sync dot pulse:      1s infinite — uploading status indicator (CSS/Animated.loop)
Skeleton shimmer:    1.5s infinite — content loading (translate X)
```

### React Native — Animated API
```js
// Sync dot pulse (uploading state)
const pulseAnim = useRef(new Animated.Value(1)).current
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
  ])
).start()

// Always use useNativeDriver: true — keeps animation on the UI thread
// Never animate layout properties (width, height, top, left) — only opacity + transform
```

### Web — CSS
```css
/* Sync dot */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.sync-uploading { animation: pulse 1s ease infinite; }

/* Skeleton shimmer */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## Icons

Use **Tabler Icons** across both platforms — consistent, outline-only, clean.

### Web
```html
<!-- Already loaded in claude.ai environment -->
<i class="ti ti-upload" aria-hidden="true"></i>
```

### React Native
```bash
npm install @tabler/icons-react-native
```
```js
import { IconUpload, IconPhoto, IconFolder } from '@tabler/icons-react-native'

// Always pass size and color — never rely on defaults
<IconUpload size={18} color={colors.dark.text2} strokeWidth={1.5} />
```

### Icon Sizing
```
14px / 14sp  — inside badges or very tight spaces
16px / 16sp  — inline with body text
18px / 18sp  — buttons, nav items (default)
20px / 20sp  — card headers
24px / 24sp  — empty states, large indicators
32px / 32sp  — illustration icons in empty states
```

---

## Specific Feature Patterns

### Blur-Hash Loading Flow
```
State 1: thumbnail slot shows solid bg color (#1e2128)
State 2: blur-hash image loads (tiny, ~1KB) → crossfade in 100ms
State 3: full WebP thumbnail loads → crossfade in 150ms
State 4: user explicitly requests full res → load full asset
```
Never skip state 2. The blur-hash is the instant visual feedback that the image exists.

### WhatsApp Approval Card (lightweight view)
This renders in a simple HTML page (no React) — keep it under 10KB total.
```
Background: #0e0f11
Blur-hash image (centered, max 400px wide)
Asset name: Sora 16px/500
Workspace name + uploader: Sora 12px/400, muted
Two full-width buttons stacked:
  APPROVE  → solid success-dim bg, success text, hairline border
  REVISE   → solid danger-dim bg, danger text, hairline border
No navbar, no logo, no other UI
```

### Offline Field Mode Visual Language
The user must always know their sync state without hunting for it. Rules:
- Show a persistent sync status bar at top of asset list when offline or syncing
- Each queued asset has a visible sync dot (color = status)
- Upload progress shows `chunk N / total` in IBM Plex Mono
- Never block the user from tagging / organizing while upload is in progress

---

## What to NEVER Do

```
❌ Gradients anywhere — surfaces, buttons, backgrounds, thumbnails
❌ Glassmorphism — backdrop-filter blur, frosted glass effects
❌ Shadows on cards — use border instead
❌ Inter, Roboto, System fonts as primary UI font
❌ Purple, teal, or cyan as the accent color
❌ Giant rounded corners (>12px on non-modal elements)
❌ Oversized padding (>24px inside a card)
❌ Bounce/spring animations on data-heavy components
❌ Bold mid-sentence text in body copy
❌ Pure black (#000000) or pure white (#ffffff) — use the palette
❌ More than 2 accent colors visible on one screen
❌ Emoji in UI (use Tabler icons instead)
❌ Title Case in UI labels
❌ 1px borders (always 0.5px / hairlineWidth)
❌ Offset-based pagination in UI (always cursor-based, infinite scroll)
❌ Skeleton screens that are wider than actual content
❌ Showing raw UUIDs to users (always show human-readable names)
```

---

## Agent Prompt Prefix (paste before any UI task)

```
Before writing any UI code for VaultKit, read and apply these rules:

FONTS: Sora for all UI text. IBM Plex Mono for badges, metadata, labels, 
hashes, file sizes, version numbers, scopes, and timestamps. 
No other fonts.

COLORS: Use the CSS variables / colors.ts tokens from DESIGN_SYSTEM.md.
Never hardcode hex values directly in components.

NO GRADIENTS: Absolutely zero gradients anywhere — not on surfaces, buttons,
thumbnails, backgrounds, or any element. This applies to both web (CSS) and 
React Native. On React Native, do not import or use expo-linear-gradient.

BORDERS: Always 0.5px on web / StyleSheet.hairlineWidth on React Native.
Never 1px. Border color: --vk-border (default) / --vk-border2 (hover/focus).

BORDER RADIUS: 6px buttons/inputs, 8px cards, 12px modals/sheets. No larger.

MOTION: Max 150ms, ease or ease-out only. useNativeDriver: true always.
No bounce, no spring on data components.

ACCENT: One accent only — #e8784a (dark) / #c5522d (light). Use sparingly.
Do not use it as a background on large surfaces.

AVOID: glassmorphism, shadows on cards, Inter font, pure black/white,
emoji in UI, Title Case labels, 1px borders, multiple accent colors per screen.
```
