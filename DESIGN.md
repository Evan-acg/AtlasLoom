---
version: alpha
name: AtlasLoom Design System
description: A warm, document-like interface with a soft off-white canvas, Inter typography, restrained blue actions, and quiet surfaces.

colors:
    primary: '#0075de'
    primary-active: '#005bab'
    secondary: '#213183'
    on-primary: '#ffffff'
    canvas: '#ffffff'
    canvas-soft: '#f6f5f4'
    surface: '#ffffff'
    ink: '#000000'
    ink-secondary: '#31302e'
    ink-muted: '#615d59'
    ink-faint: '#a39e98'
    hairline: '#e6e6e6'

typography:
    display-1:
        fontFamily: Inter
        fontSize: 64px
        fontWeight: 700
        lineHeight: 1.0
        letterSpacing: -2.125px
    display-2:
        fontFamily: Inter
        fontSize: 54px
        fontWeight: 700
        lineHeight: 1.04
        letterSpacing: -1.875px
    heading-1:
        fontFamily: Inter
        fontSize: 40px
        fontWeight: 700
        lineHeight: 1.1
        letterSpacing: -1px
    heading-2:
        fontFamily: Inter
        fontSize: 26px
        fontWeight: 700
        lineHeight: 1.23
        letterSpacing: -0.625px
    heading-3:
        fontFamily: Inter
        fontSize: 22px
        fontWeight: 700
        lineHeight: 1.27
        letterSpacing: -0.25px
    title:
        fontFamily: Inter
        fontSize: 20px
        fontWeight: 600
        lineHeight: 1.4
        letterSpacing: -0.125px
    body-md:
        fontFamily: Inter
        fontSize: 16px
        fontWeight: 400
        lineHeight: 1.5
        letterSpacing: 0
    body-sm:
        fontFamily: Inter
        fontSize: 15px
        fontWeight: 400
        lineHeight: 1.33
        letterSpacing: 0
    button:
        fontFamily: Inter
        fontSize: 16px
        fontWeight: 500
        lineHeight: 1.5
        letterSpacing: 0
    caption:
        fontFamily: Inter
        fontSize: 14px
        fontWeight: 400
        lineHeight: 1.43
        letterSpacing: 0
    eyebrow:
        fontFamily: Inter
        fontSize: 12px
        fontWeight: 600
        lineHeight: 1.33
        letterSpacing: 0.125px

rounded:
    xs: 4px
    sm: 6px
    md: 8px
    lg: 12px
    xl: 16px
    full: 9999px

spacing:
    xxs: 4px
    xs: 8px
    sm: 12px
    md: 16px
    lg: 24px
    xl: 28px
    xxl: 32px

components:
    app-shell:
        backgroundColor: '{colors.canvas-soft}'
        textColor: '{colors.ink}'
        minWidth: 320px
    page-container:
        maxWidth: 1200px
        padding: '{spacing.md}'
    nav-bar:
        backgroundColor: '{colors.canvas}'
        textColor: '{colors.ink}'
        typography: '{typography.body-sm}'
        padding: '{spacing.md}'
    button-primary:
        backgroundColor: '{colors.primary}'
        textColor: '{colors.on-primary}'
        typography: '{typography.button}'
        rounded: '{rounded.full}'
        minHeight: 44px
    button-primary-pressed:
        backgroundColor: '{colors.primary-active}'
        textColor: '{colors.on-primary}'
    button-secondary:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink}'
        typography: '{typography.button}'
        rounded: '{rounded.full}'
        borderColor: '{colors.hairline}'
        minHeight: 44px
    button-utility:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink}'
        typography: '{typography.button}'
        rounded: '{rounded.md}'
        padding: '8px 14px'
        minHeight: 44px
    content-card:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink}'
        typography: '{typography.body-md}'
        rounded: '{rounded.lg}'
        padding: '{spacing.lg}'
        borderColor: '{colors.hairline}'
    text-input:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink}'
        typography: '{typography.body-sm}'
        rounded: '{rounded.xs}'
        padding: '{spacing.sm}'
        borderColor: '{colors.hairline}'
        minHeight: 44px
    app-shell-row:
        backgroundColor: '{colors.canvas}'
        textColor: '{colors.ink}'
        typography: '{typography.body-sm}'
        activeIndicator: '{colors.primary}'
        rounded: '{rounded.sm}'
        padding: '{spacing.sm} {spacing.md}'
    empty-state:
        backgroundColor: '{colors.canvas-soft}'
        textColor: '{colors.ink-secondary}'
        typography: '{typography.body-md}'
        rounded: '{rounded.xl}'
        padding: '{spacing.xxl}'
    toast:
        backgroundColor: '{colors.surface}'
        textColor: '{colors.ink}'
        typography: '{typography.body-sm}'
        rounded: '{rounded.lg}'
        padding: '{spacing.sm} {spacing.md}'
---

## Overview

AtlasLoom uses a warm, paper-like canvas and a quiet neutral interface. Inter typography establishes hierarchy; a single confident blue identifies primary actions and links. Hairline borders and restrained elevation separate content without making the interface feel heavy.

This is the target design system for new and changed UI. The current home page is a starter shell and may not yet reflect every token below. Product-specific layouts should use these foundations without copying reference-site marketing sections or decorative assets.

The color aliases and `font-sans` family are configured in `uno.config.ts` as extensions to `presetWind3()`. They add project tokens without replacing Wind3's built-in palette, spacing, sizing, or responsive utilities.

**Key Characteristics:**

- Warm off-white `{colors.canvas-soft}` page canvas with white content surfaces
- Inter type with a clear, compact hierarchy and comfortable body line height
- One structural accent — `{colors.primary}` — reserved for primary actions, links, and active/focus signals
- Near-black ink, warm secondary text, and quiet `{colors.hairline}` dividers
- Generous whitespace, 8px-based spacing, and responsive content containers
- Friendly 8–16px component radii; pill shapes reserved for prominent actions
- Flat surfaces by default, with subtle elevation only where it clarifies layering

## Colors

### Brand & Accent

- **Primary Blue** (`{colors.primary}` — #0075de): primary actions, inline links, selected navigation, and focus indicators.
- **Pressed Blue** (`{colors.primary-active}` — #005bab): pressed/active state for primary actions.
- **Deep Indigo** (`{colors.secondary}` — #213183): optional emphasis for a distinct feature surface; do not repeat it as a second structural accent.
- Keep decorative colors out of the core palette. Add a separate illustration palette only when the product has a concrete need for it.
- Use the matching UnoCSS classes: `bg-primary`, `text-primary`, `border-hairline`, `bg-canvas-soft`, `text-ink-secondary`, and `hover:bg-primary-active`. Keep the default Wind3 palette available for utilities that are not project tokens.

### Surface

- **White** (`{colors.canvas}` / `{colors.surface}` — #ffffff): cards, panels, navigation, and form fields.
- **Warm Canvas** (`{colors.canvas-soft}` — #f6f5f4): page background and broad section surfaces.
- **Hairline** (`{colors.hairline}` — #e6e6e6): subtle borders and dividers.

### Text

- **Ink** (`{colors.ink}` — #000000): headings and primary content.
- **Warm Charcoal** (`{colors.ink-secondary}` — #31302e): secondary content.
- **Stone** (`{colors.ink-muted}` — #615d59): supporting text and labels.
- **Ash** (`{colors.ink-faint}` — #a39e98): decorative or non-essential metadata only; do not use for essential small text without checking contrast.

### Semantic

No dedicated success, warning, or error palette is established yet. Add semantic tokens when a real workflow requires them, and ensure status is communicated with text or iconography as well as color.

## Typography

### Font Family

Use **Inter** through the configured `font-sans` utility, which falls back to the platform sans-serif stack. Do not depend on proprietary font files or add a remote font without a product requirement.

### Hierarchy

| Token                    | Size | Weight | Line Height | Letter Spacing | Use                          |
| ------------------------ | ---- | ------ | ----------- | -------------- | ---------------------------- |
| `{typography.display-1}` | 64px | 700    | 1.0         | −2.125px       | Page hero headline           |
| `{typography.display-2}` | 54px | 700    | 1.04        | −1.875px       | Large section headline       |
| `{typography.heading-1}` | 40px | 700    | 1.1         | −1px           | Page or section heading      |
| `{typography.heading-2}` | 26px | 700    | 1.23        | −0.625px       | Subsection heading           |
| `{typography.heading-3}` | 22px | 700    | 1.27        | −0.25px        | Card heading                 |
| `{typography.title}`     | 20px | 600    | 1.4         | −0.125px       | Feature title or callout     |
| `{typography.body-md}`   | 16px | 400    | 1.5         | 0              | Default body copy            |
| `{typography.body-sm}`   | 15px | 400    | 1.33        | 0              | Dense content and navigation |
| `{typography.button}`    | 16px | 500    | 1.5         | 0              | Button label                 |
| `{typography.caption}`   | 14px | 400    | 1.43        | 0              | Caption or footnote          |
| `{typography.eyebrow}`   | 12px | 600    | 1.33        | +0.125px       | Short metadata label         |

### Principles

Use weight and size to establish hierarchy instead of decorative type treatments. Keep body copy readable at a 1.5 line height; use tight negative tracking only for large display headings. On narrow screens, scale display text down before allowing it to wrap awkwardly or overflow.

Use Wind3 typography utilities when their values match the token. For exact values without a named utility, use UnoCSS arbitrary values (for example, `text-[54px]`, `leading-[1.04]`, and `tracking-[-1.875px]`) rather than assuming an undocumented utility exists.

## Layout

### Spacing System

- **Base unit**: 8px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 28px · `{spacing.xxl}` 32px.
- Use the spacing scale consistently. Card padding is usually 24px; compact controls use 8–16px; page sections need visibly larger separation.

These values map directly to the Wind3 spacing scale: `p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-7`, and `p-8` respectively. Use the corresponding `m-*`, `gap-*`, and directional utilities as needed; do not add duplicate spacing aliases to the UnoCSS theme.

### Grid & Container

Centre page content in a fluid container with a maximum width near 1200px and consistent side gutters. In Wind3, express this exact width with `max-w-[1200px]`; do not assume a `max-w-1200` token exists. The 320px minimum shell width maps to `min-w-[320px]`. Use simple single-column reading layouts by default; introduce multi-column grids only when they improve comparison or scanning.

### Whitespace Philosophy

Use whitespace as the primary grouping device. Prefer clear section spacing and subtle hairlines over repeated boxes, heavy dividers, or dense decoration.

### Responsive Strategy

Use the project's UnoCSS Wind3 breakpoints and build from the narrow layout upward. The values below are Wind3 defaults, not a second breakpoint system.

| Name | Width   | Key Changes                                                            |
| ---- | ------- | ---------------------------------------------------------------------- |
| Base | <640px  | Single-column content, compact gutters, controls remain easy to tap    |
| `sm` | 640px+  | Increase page gutters where space allows                               |
| `md` | 768px+  | Allow two-column layouts when content benefits                         |
| `lg` | 1024px+ | Use the full content container and wider grids                         |
| `xl` | 1280px+ | Keep content centred; do not stretch reading measure to viewport width |

#### Touch Targets

Aim for a 44×44px minimum hit area for primary controls on touch screens (`min-h-11` is 44px in the Wind3 scale). Do not reduce vertical padding just to fit a dense row.

#### Collapsing Strategy

Stack multi-column content on narrow screens, preserve the reading order, and allow primary actions to become full width when that improves mobile use. Avoid horizontal scrolling for general page content.

#### Image Behavior

Scale images fluidly within their container and preserve their aspect ratio unless intentional cropping is part of the feature. Use `{rounded.lg}` or `{rounded.xl}` frames with a subtle hairline when an image needs separation from the canvas.

## Elevation & Depth

| Level        | Treatment                             | Use                                        |
| ------------ | ------------------------------------- | ------------------------------------------ |
| 0 — Flat     | `{colors.hairline}` border, no shadow | Default cards and panels                   |
| 1 — Soft     | Wind3 `shadow-sm`                     | Floating controls or gently raised content |
| 2 — Elevated | Wind3 `shadow-lg`                     | Modal dialogs and popovers only            |

Default to flat surfaces. Avoid heavy drop shadows and do not use elevation as a substitute for clear hierarchy or spacing.

## Shapes

### Border Radius Scale

| Token            | Value  | Use                                                       |
| ---------------- | ------ | --------------------------------------------------------- |
| `{rounded.xs}`   | 4px    | `rounded` — inputs, small tags, inline chips              |
| `{rounded.sm}`   | 6px    | `rounded-md` — menu rows and compact items                |
| `{rounded.md}`   | 8px    | `rounded-lg` — utility buttons and compact cards          |
| `{rounded.lg}`   | 12px   | `rounded-xl` — content cards and image frames             |
| `{rounded.xl}`   | 16px   | `rounded-2xl` — large containers and empty-state surfaces |
| `{rounded.full}` | 9999px | `rounded-full` — prominent CTA buttons and compact pills  |

Use these built-in Wind3 radius utilities rather than redefining the preset's `rounded-*` scale.

## Components

### Navigation

**`nav-bar`** — Use a white surface, ink-colored links, and body-sm typography. Keep navigation concise; collapse it rather than crowding it on narrow screens. Use `{colors.primary}` only to identify the active item or a clear action.

### Buttons

**`button-primary`** — Use `{colors.primary}` with white text and a pill radius for the single most important action in a section.

**`button-primary-pressed`** — Use `{colors.primary-active}` for the pressed state. Keep a separate visible keyboard focus style; hover, pressed, and focus are distinct states.

**`button-secondary`** — Use a white surface, ink text, and a hairline border. Reserve it for a lower-priority action beside the primary button.

**`button-utility`** — Use the tighter `{rounded.md}` radius for compact navigation or utility actions. Keep touch targets comfortable even when visual padding is compact.

### Cards & Containers

**`content-card`** — Use a white surface, 12px radius, 24px padding, and a hairline border. Leave cards flat by default; use the soft elevation level only for a meaningful raised state.

**`empty-state`** — Use the warm canvas surface, restrained text hierarchy, and generous padding. Explain the current state and provide a relevant next action when one exists.

### Inputs & Forms

**`text-input`** — Use a white surface, ink text, a hairline border, and a 4px radius. Provide a persistent label, clear focus treatment, and readable validation feedback.

### Feedback

**`toast`** — Use a white surface, ink text, a hairline border, and a compact rounded shape. Include a clear message; do not rely on color alone to communicate status.

## Interaction & Accessibility

- All controls must be keyboard operable and show a visible focus state.
- Use semantic HTML and descriptive accessible names; pair status color with text or an icon.
- Provide default, hover, pressed, focus, disabled, loading, empty, and error states where applicable.
- Respect `prefers-reduced-motion`; movement must not be needed to understand state or hierarchy.
- Use `aria-live` only for dynamic updates that need to be announced, and keep announcements concise.
- Check text contrast, especially for `{colors.ink-faint}` and text on `{colors.primary}`.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` for actions, links, active navigation, and focus signals.
- Keep the warm canvas and white surfaces as the default page/surface contrast.
- Use `{colors.hairline}` and whitespace before reaching for shadows or heavy borders.
- Keep component radii consistent with the scale above.
- Use UnoCSS Wind3 utilities for responsive styling and keep shared primitives visually consistent.

### Don't

- Don't introduce a second structural accent or use decorative color as an action color.
- Don't copy reference-site marketing layouts, proprietary assets, or brand-specific content into AtlasLoom.
- Don't use pill radii for form fields or apply heavy shadows to ordinary cards.
- Don't use faint text for essential information or color alone for status.
- Don't force every page into a hero-and-card layout; choose components to fit the content.
