# Design System Specification: Editorial Vitality



## 1. Overview & Creative North Star: "The Living Canvas"

This design system rejects the "utilitarian grid" in favor of an editorial experience that feels as restorative as the health journey it facilitates. Our Creative North Star is **"The Living Canvas."**



Unlike standard health apps that rely on rigid borders and heavy data containers, this system treats the screen as a high-end wellness journal. We break the "template" look through **intentional asymmetry**—offsetting headlines and using generous, "uncomfortable" amounts of whitespace to signal luxury and mental clarity. By prioritizing tonal depth over structural lines, we create an interface that breathes, moves, and feels organic rather than mechanical.



---



## 2. Colors: Tonal Architecture

The palette is rooted in botanical sage and limestone neutrals. We move away from flat UI by utilizing Material Design tokens to create a sophisticated, "ink-on-paper" feel.



### The "No-Line" Rule

**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface-container-low` (#f0f4f3) section should sit directly against a `background` (#f8faf9) to create a soft, edge-less transition.



### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—like stacked sheets of fine vellum.

* **Base:** `background` (#f8faf9) or `surface-lowest` (#ffffff).

* **Secondary Layer:** `surface-container-low` (#f0f4f3) for grouping content.

* **Emphasis Layer:** `primary-container` (#d1e8db) for high-priority health insights.



### Signature Textures & Glass

To avoid a "flat" digital feel, use **Glassmorphism** for floating elements (e.g., FABs or Top App Bars) using `surface` colors at 80% opacity with a `20px` backdrop blur. For primary CTAs, apply a subtle linear gradient from `primary` (#4f6359) to `primary-dim` (#44574e) at a 145° angle to provide a "silk-touch" finish.



---



## 3. Typography: The Editorial Voice

We utilize **Manrope** for its geometric yet warm characteristics. The hierarchy is designed to feel like a high-end wellness magazine.



* **Display (lg/md):** Reserved for "Moment of Zenith" screens (e.g., daily goals met). Use `on-surface` (#2d3433) with a `-0.02em` letter spacing to feel authoritative.

* **Headline (sm/md):** Use these to start sections, but never center them. Align them to the left with a `spacing-6` (2rem) top margin to create "asymmetric breathing room."

* **Title & Body:** `body-lg` (1rem) is our workhorse. Ensure a line height of at least `1.6` to maintain the "uncluttered" promise.

* **Labels:** Use `label-md` (#596060) in all-caps with `0.05em` tracking for metadata to create a premium, "archival" aesthetic.



---



## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "tech." We achieve depth through **Ambient Luminescence.**



* **The Layering Principle:** Instead of shadows, place a `surface-container-lowest` card on a `surface-container` background. The subtle shift from #ffffff to #eaefee creates a natural, "physical" lift.

* **Ambient Shadows:** If a card must float (e.g., a modal), use an ultra-diffused shadow: `0px 12px 32px rgba(45, 52, 51, 0.04)`. The shadow color is a tint of `on-surface`, never pure black.

* **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#acb3b2) at **15% opacity**. Anything more is considered "visual noise."



---



## 5. Components: Softness & Intent



### Buttons

* **Primary:** Rounded `lg` (1rem). Background: `primary`. Text: `on-primary`. No shadow; depth is achieved via the "Silk" gradient mentioned in Section 2.

* **Tertiary:** Text-only in `primary` (#4f6359). Use for low-priority actions like "Learn More."



### Cards & Lists

* **The "No-Divider" Mandate:** Forbid the use of horizontal divider lines. Separate list items using `spacing-3` (1rem) of vertical whitespace.

* **Health Cards:** Use `surface-container-low` with a `xl` (1.5rem) corner radius. Elements inside the card should be padded by `spacing-5` (1.7rem) to ensure content never feels "trapped."



### Inputs & Selection

* **Input Fields:** Ghost style. No background fill, only a "Ghost Border" at the bottom. The label should use `label-sm` and sit `spacing-1` above the input.

* **Chips:** Use `secondary-container` (#d8e6de) with `full` (9999px) roundedness. They should feel like "smooth river stones."



### Specialized App Components

* **Progress Rings:** Use `primary` for the progress and `surface-variant` for the track. Keep the stroke weight thin (2px) to maintain the minimalist aesthetic.

* **Bottom Navigation:** Use a semi-transparent `surface` with a 24px backdrop blur. Icons should be "Thin" or "Light" weight linear strokes.



---



## 6. Do’s and Don'ts



### Do

* **Do** use asymmetrical margins (e.g., a wider left margin than right) for headline typography to create a custom, editorial feel.

* **Do** use `spacing-16` (5.5rem) or `spacing-20` (7rem) between major sections to let the user's eyes rest.

* **Do** prioritize `primary-fixed-dim` (#c3dacd) for backgrounds of success states or "calm" moments.



### Don't

* **Don't** use 100% opaque black for text. Always use `on-surface` (#2d3433) for a softer, more organic read.

* **Don't** use standard "Material Blue" or "Success Green." Stick strictly to the sage and neutral palette provided.

* **Don't** crowd icons. Every icon should have a "safe zone" of at least `spacing-2` (0.7rem) around it.