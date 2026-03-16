---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Default style follows TCC Technology brand (sky blue, clean corporate). Override colors/style as needed. Use when building web components, pages, or applications.
license: Complete terms in LICENSE.txt
---

This skill creates production-grade frontend interfaces using the project's established design system as the default baseline. Apply these defaults as-is to match the existing site, or override specific values when the user specifies a different color palette, mood, or style.

**Reading the request:**
- No style specified → use all defaults below as-is
- User provides colors → swap `--accent` and `--accent-dark` (and derived hover/glow values) with their colors, keep everything else
- User specifies a mood/style (minimal, dark, luxury, etc.) → keep the component patterns, adjust palette and typography accordingly
- User says "เหมือนเว็บเดิม" / "same as current site" → apply every default exactly

---

## Design System Defaults

These values reproduce the current project's look and feel. Override only what the user asks to change.

### Color Tokens

Declare in `:root` (or Tailwind CSS v4 `@theme`):

```css
:root {
  /* Accent scale — default: TCC Technology sky blue. Replace with user's brand color. */
  --accent:        hsl(200 73% 53%);  /* #29ABE2 — TCC primary sky blue */
  --accent-dark:   hsl(200 75% 38%);  /* #1A7FAD — deep blue, gradient end */
  --accent-mid:    hsl(200 65% 65%);  /* lighter blue variant */
  --accent-soft:   hsl(200 60% 94%);  /* #E8F6FC — pale blue background tint */
  --accent-bright: hsl(199 88% 62%);  /* #3FC4F7 — hover highlight */
  --accent-glow:   hsl(200 73% 48%);  /* focus ring glow */

  /* Supporting color — default: TCC navy/dark blue */
  --supporting:    hsl(210 45% 22%);  /* #1E3A5F — dark navy; buttons, sidebar active */
  --supporting-fg: hsl(0 0% 100%);

  /* Surfaces */
  --background:    hsl(210 20% 98%);  /* cool off-white page background */
  --surface:       hsl(0 0% 100%);    /* card / panel background */
  --surface-alt:   hsl(210 15% 96%);  /* secondary / muted surface */
  --sidebar-bg:    hsl(210 25% 97%);  /* sidebar background */

  /* Text */
  --text-primary:   hsl(210 20% 10%);
  --text-secondary: hsl(210 10% 40%); /* labels, captions */
  --text-muted:     hsl(210 8% 62%);  /* placeholders */

  /* Borders */
  --border:         hsl(210 15% 88%);
  --border-accent:  hsl(200 30% 84%); /* accent-tinted border */

  /* Status */
  --status-success: hsl(142 60% 40%);
  --status-warning: hsl(38 90% 52%);
  --status-error:   hsl(0 65% 52%);
  --status-info:    hsl(200 73% 53%);  /* matches --accent */

  /* Radius */
  --radius: 0.375rem;  /* base — components use 0.5rem / 0.75rem overrides */

  /* Dark mode overrides (.dark) */
  /* --background: hsl(210 30% 6%);  --surface: hsl(210 25% 10%); */
  /* --sidebar-bg: hsl(210 30% 8%);  --accent: hsl(200 80% 60%); */
}
```

**Customizing colors:** When the user provides a hex color (e.g. `#2563EB`), convert it to HSL and set `--accent` to that hue/chroma. Then derive:
- `--accent-dark`: same hue, −10–14% lightness
- `--accent-bright`: same hue, +15% lightness, +15–20% saturation
- `--accent-soft`: same hue, lightness 90–94%
- `--accent-glow`: same hue, midpoint lightness
- Keep `--supporting` neutral or match the user's secondary color if given

### Typography

```css
/* Default: TCC Technology corporate stack — bilingual Thai/Latin */
--font-display: 'Sarabun', 'Noto Sans Thai', system-ui, sans-serif;
--font-sans:    'Sarabun', 'Noto Sans Thai', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', monospace;
```

```html
<!-- Always include when using default font stack -->
<link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Thai:wght@300;400;500;600&display=swap" rel="stylesheet">
```

- **Body**: `font-weight: 400`, `line-height: 1.65`, `letter-spacing: -0.005em`
- **Headings**: `font-weight: 600`, `letter-spacing: -0.02em`, `line-height: 1.2`
- **Thai content** (`[lang="th"]`): `letter-spacing: 0`, `line-height: 1.8`, `font-weight: 400`

**Customizing fonts:** If user wants a different mood, replace the font stack:
- Luxury/editorial → Playfair Display + DM Sans
- Technical/data-heavy → IBM Plex Sans + IBM Plex Mono
- Minimal → Geist or Plus Jakarta Sans
- Bilingual Thai/EN (default) → Sarabun + Noto Sans Thai
- Always avoid: Inter, Roboto, Arial, generic system-ui alone

### Component Patterns

These patterns use `var(--accent)` tokens — they automatically reflect any color override.

**Cards**
```
bg-white
border border-[hsl(var(--border))]
shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]
rounded-lg overflow-hidden
```
- Hover: `shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.18)] border-[hsl(var(--accent)/0.3)]`
- Hover: reveal left `3px` accent border: `border-l-[3px] border-l-[hsl(var(--accent))]`
- Top image / banner areas: use `bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--supporting))]`

**Primary CTA Button**
```
bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-bright))]
text-white h-11 px-8 rounded-md font-semibold tracking-wide
transition-colors duration-200
shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.4)]
```
Secondary/outline variant:
```
border-2 border-[hsl(var(--accent))] text-[hsl(var(--accent))]
hover:bg-[hsl(var(--accent))] hover:text-white
h-11 px-8 rounded-md font-semibold transition-all duration-200
```

**Input Fields**
```
h-11 rounded-xl bg-white/60
border border-[hsl(var(--border))]
focus:border-[hsl(var(--accent)/0.4)] focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)]
transition-colors duration-200
```

**Sidebar Navigation — Active Item**
```
bg-gradient-to-r from-[hsl(var(--accent)/0.12)] to-[hsl(var(--accent)/0.06)]
text-[hsl(var(--accent-dark))] font-medium
shadow-[inset_2px_0_0_hsl(var(--accent))]
rounded-lg
```

**Hero / Page Header** (full-width blue banner — signature TCC pattern)
```css
/* Solid blue hero with subtle depth */
background: linear-gradient(135deg, hsl(200 73% 53%) 0%, hsl(210 75% 38%) 100%);
color: white;
padding: 4rem 0;
```
Optional: light diagonal stripe texture over hero:
```css
background-image: repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 40px,
  hsl(0 0% 100% / 0.03) 40px,
  hsl(0 0% 100% / 0.03) 80px
);
```

**Page Body Background**
```css
/* Cool near-white — keeps blue accent vibrant */
background: hsl(210 20% 98%);
```

**Noise Texture Overlay** (3% grain over any surface):
```css
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
```

**Custom Scrollbar**
```css
scrollbar-width: thin;
scrollbar-color: hsl(var(--accent) / 0.3) transparent;
```

### Animation Defaults

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-smooth:   cubic-bezier(0.4, 0, 0.2, 1);
--dur-fast:  150ms;
--dur-base:  250ms;
--dur-slow:  400ms;
--dur-enter: 600ms;
```

**Page entrance** (Framer Motion — apply to page wrapper):
```ts
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
```
Stagger children: `staggerChildren: 0.08`.

### shadcn/ui Config
- Style: `new-york` (sharper edges, denser spacing)
- All colors via CSS variables — never hardcode hex values in JSX
- Icons: Lucide React exclusively
- Default border-radius on components: `rounded-xl` (0.75rem), `rounded-2xl` (1rem)

---

## Style Overrides by Mood

When the user asks for a specific feel, apply these adjustments on top of the base defaults:

| Mood | Accent Color Direction | Surface | Font Change | Motion |
|---|---|---|---|---|
| **TCC default** | Sky blue `hsl(200 73% 53%)` | Cool white bg, blue hero banner | Sarabun 400/600 | Fade-up entrance, subtle card hover lift |
| **Minimal / clean** | Low-sat blue-gray | Pure white, no gradient | Plus Jakarta Sans | Opacity-only fades |
| **Dark / tech** | Lift accent to `hsl(200 85% 62%)` | `hsl(220 30% 8%)` base, `hsl(220 25% 12%)` card | Keep Sarabun | Add blue glow on hover: `box-shadow: 0 0 24px hsl(var(--accent)/0.35)` |
| **Luxury / premium** | Deep navy `hsl(215 60% 22%)` + gold `hsl(42 60% 48%)` accent | Warm off-white, noise texture | Playfair Display + DM Sans | Slow entrances (800ms), parallax |
| **Playful / colorful** | Brighter cyan or teal | Light colorful surface | Nunito or Quicksand | Spring easing, scale on hover |
| **Custom brand** | User-provided hex → derive full scale | Match surface warmth to hue | Keep or swap per mood above | Match motion energy to brand personality |

---

## Output Requirements

- Always output **complete, working code** — no `// TODO` or placeholder stubs
- React + Tailwind CSS v4 by default; adjust if user specifies another stack
- All colors via CSS variables; no hardcoded hex/hsl values inline in JSX
- Responsive: mobile-first, valid at 375px and 1280px
- Include all imports and full component structure ready to drop in