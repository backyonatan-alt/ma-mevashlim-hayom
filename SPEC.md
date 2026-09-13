# SPEC: מה מבשלים היום

## 1. What this is

A private family recipe book. 19 recipes at launch, more added over time by Yonatan via git.
Two users: Yonatan and Inbar. Sometimes shared with family via link. No login.

Three jobs the site must do well:

1. **Find a recipe fast** on the phone while standing in the kitchen.
2. **Cook from it** with dirty hands: big text, screen stays on, tap to check off.
3. **Print it** as a clean one-page PDF to send to family.

## 2. Recipe file schema

Location: `src/content/recipes/<slug>.md`. Slug = filename.

```yaml
---
title: string            # Hebrew, required
category: enum           # one of: בשר | עוף | עוגות | מאפים וארוחת בוקר | לתמר | מרקים ופשטידות
tags: string[]           # Hebrew, optional, free-form
prepTime: number         # minutes of active work, optional
totalTime: number        # minutes start to finish, optional
servings: string         # free text, e.g. "4 מנות" or "תבנית 24 ס\"מ", optional
family: boolean          # true = our own recipe, false = saved from the web
source: string           # display name of source, required
sourceUrl: string        # optional, URL
author: string           # optional
---
```

Body is Markdown with these H2 sections, in this order:

- `## מצרכים` — bullet list. May contain H3 sub-groups (`### לבצק`, `### למלית`).
- `## הכנה` — numbered list. Steps may contain bold lead-ins.
- `## הערות` — optional, bullet list.

Parse the body into structured sections (ingredients / steps / notes) so cooking mode can render them separately. Do not rely on raw HTML.

## 3. Pages

### 3.1 Home `/`

- Site title: **מה מבשלים היום**
- Search box at top, filters as you type (title + tags + category). Client-side, over a small JSON built at build time. No search library needed; simple `includes` on normalized strings is fine.
- Category chips under search: הכל | בשר | עוף | עוגות | מאפים וארוחת בוקר | לתמר | מרקים ופשטידות. Tap to filter. Only one active at a time.
- Recipe cards: title, category, total time (if any), small badge "שלנו" when `family: true`.
- Grid: 1 column on phone, 2-3 on desktop.
- Sort: alphabetical by title. No "recent" or "popular" in v1.

### 3.2 Recipe `/recipes/<slug>`

Desktop layout: two columns. Ingredients on the right (RTL start), steps on the left. Sticky ingredients column on scroll.

Phone layout: single column. Ingredients first, then steps.

Header block:
- Title (h1)
- Meta line: category · prep time · total time · servings. Hide missing fields.
- Source line: "מקור: <source>" linked to `sourceUrl` if present. If `family: true` show "המתכון שלנו" instead.
- Two buttons: **מצב בישול** and **הדפסה**.

Body:
- Ingredients as a checklist (each line has a checkbox; tapping the text also toggles).
- Steps numbered, generous line height.
- Notes at the bottom in a lightly tinted box.
- "חזרה לכל המתכונים" link at bottom.

### 3.3 Cooking mode (same URL, toggled state, `?cook=1` or hash)

This is the feature that matters most. When active:

- Request `navigator.wakeLock` so the screen stays on. Re-request on `visibilitychange`. Show a small indicator when active; fail silently if unsupported.
- Font size goes up (~20px body, 26px+ steps on phone).
- Layout: ingredients collapse into an expandable panel at the top ("מצרכים ▾"). Steps take the full screen.
- Each step is a large tappable card. Tapping marks it done (dimmed, checkmark). Progress "3 / 7" at top.
- Check state persists in `localStorage` per recipe slug so a phone lock or accidental refresh doesn't lose place. "איפוס" button clears it.
- If a step contains a duration pattern like `20 דקות`, `20-30 דקות`, `חצי שעה`, `שעה` — show a small timer button next to it. Tapping starts a countdown in a fixed bottom bar with pause and reset. One timer at a time. Beep (Web Audio, short tone) and vibrate on finish. Timer uses the first number of a range.
- Exit button "יציאה" top corner returns to normal view and releases wake lock.
- Works fully offline once loaded (no fetches inside cooking mode).

### 3.4 Print (`@media print`)

Triggered by the הדפסה button (`window.print()`), and also correct if user hits Ctrl+P.

- Hide: nav, buttons, search, checkboxes, timer, footer.
- Show: title, meta line, source line, ingredients, steps, notes.
- Two-column layout on A4 portrait when both fit; fall back to single column for long recipes.
- 11-12pt body, black on white, no backgrounds, no shadows.
- Footer on the page: "מה מבשלים היום" small, and the site URL.
- `@page { size: A4; margin: 15mm; }`
- Target: every recipe in the collection fits one page. Verify on the longest ones (bagels, עקיצת הדבורה, קציצות בריבת בצל).

### 3.5 Category page `/category/<category>` (optional, cheap)

Same as home but pre-filtered. Only if it costs nothing; otherwise chips on home are enough.

## 4. Design

- Warm and plain. Cream background (`#faf6ef`), near-black text (`#1f1b16`), one accent (terracotta `#b5532b`) for buttons, chips and checkmarks. Category chips can each have a soft tint but keep it subtle.
- Heebo font. Weights 400, 500, 700.
- Radius 12px on cards and buttons. Thin 1px borders in `#e6dfd2`. Shadows minimal or none.
- Touch targets ≥ 44px. Buttons full-width on phone.
- Dark mode: skip in v1.
- Favicon: a simple pot or spoon emoji rendered to SVG is fine.

## 5. Non-goals for v1

- No images
- No user accounts, no comments, no ratings
- No scaling servings (x2 / ÷2)
- No shopping list
- No CMS or admin UI
- No i18n; Hebrew only

## 6. Build order

1. Scaffold Astro, move `recipes/` into `src/content/recipes/`, write the Zod schema, get `npm run build` green with all 19 recipes.
2. Recipe page, plain (no cooking mode yet). Verify RTL, numbers, fractions on phone width.
3. Home page with search and chips.
4. Print CSS. Check every recipe fits one A4 page.
5. Cooking mode: wake lock, big steps, check-off, localStorage.
6. Timers.
7. PWA manifest (name, icons, `display: standalone`) so it can be added to the home screen.
8. Deploy to Vercel. Confirm the live site on an actual phone.

Stop after each step and show what was done. Do not skip ahead.

## 7. Acceptance checklist

- [ ] All 19 recipes render, no build warnings
- [ ] Hebrew RTL correct everywhere, fractions and ranges not flipped
- [ ] Search finds "קציצות" → 3 results, "לתמר" chip → 2+ results
- [ ] Cooking mode keeps screen on for 5 minutes on a real phone
- [ ] Refreshing in cooking mode keeps checked steps
- [ ] Timer fires and beeps
- [ ] Print preview of בורקס בשר is one clean page
- [ ] Lighthouse mobile: performance ≥ 95, accessibility ≥ 95
