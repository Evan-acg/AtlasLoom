# Design Constraints

This document defines the current UI baseline for AtlasLoom. Apply it to new and changed UI unless a feature has an explicit, documented design decision that requires a deliberate exception.

## Visual direction

- Keep the interface clear, calm, and lightweight. Prefer content hierarchy and useful whitespace over decoration.
- Use the existing neutral surfaces with indigo as the primary accent. Do not introduce new brand colors, gradients, or shadows without a clear product need.
- Keep the interface visually consistent across routes; shared patterns should look and behave alike.

## Color and typography

- Page background: `#f5f7fb`.
- Primary text: Slate 950 (`#0f172a`). Use Slate 600 for supporting copy and Slate 500 for secondary labels.
- Surfaces: white; subtle borders: Slate 200.
- Primary actions: Indigo 600, with Indigo 700 for hover. Keep a visible focus treatment using the same accent family.
- Use the existing Inter-first system font stack from `src/styles/main.css`. Avoid adding a font download or another typeface without a product requirement.
- Use UnoCSS Wind3 palette utilities for component styles. If a new semantic color becomes a shared design token, document its role here and define it centrally rather than scattering arbitrary color values.

## Layout and responsive behavior

- Design mobile-first. Support a minimum viewport width of 320 CSS pixels; do not introduce horizontal scrolling at supported widths.
- Prefer fluid widths and the existing UnoCSS spacing scale. Use max-widths to keep long-form content readable and preserve consistent page gutters.
- Use responsive utilities for layout changes; avoid fixed dimensions that cause clipping or overlap on narrow screens.
- Check layout at narrow mobile, wide mobile, tablet, laptop, and desktop widths for page-level UI changes.

## Components and styling

- Use Vue single-file components and UnoCSS Wind3 utilities for component-level styling.
- Keep `src/styles/main.css` for resets, global typography, and application-wide base styles. Avoid adding component-specific global selectors.
- Prefer semantic HTML and native controls. Add a new component or dependency only when it provides a reusable project-level benefit.
- Keep visual treatments restrained: modest corner rounding, subtle borders, and shadows only where they clarify grouping or elevation.

## Interaction and accessibility

- All interactive elements must be keyboard operable and have a visible `focus-visible` state.
- Use descriptive accessible names and semantic elements. Do not rely on color alone to communicate state.
- Provide clear hover, focus, disabled, loading, empty, and error states where those states apply.
- Make primary touch targets at least 44 by 44 CSS pixels where practical.
- Respect `prefers-reduced-motion`; transitions must not be required to understand an interaction or state change.
- Announce asynchronous or otherwise important dynamic updates to assistive technology when appropriate (for example, with a restrained `aria-live` region).

## Maintaining these constraints

- Treat this as the current baseline, not a reason to force unrelated features into the starter page's visual style.
- When an intentional product decision changes a shared color, typography, spacing, or interaction pattern, update this document alongside the implementation.
