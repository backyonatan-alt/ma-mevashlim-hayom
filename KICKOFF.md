# פרומפט פתיחה לקלוד קוד

להדביק את זה כהודעה הראשונה:

---

Read CLAUDE.md and SPEC.md fully before doing anything.

This folder has 19 recipe markdown files in `recipes/` and a complete spec. Build the site following the "Build order" in SPEC.md section 6, one step at a time. After each step: run `npm run build`, confirm it passes, commit, and show me a short summary of what you did and what's next. Then wait for me to say "continue" before the next step.

Start with step 1 now: scaffold Astro (minimal template, TypeScript strict), move the recipes into `src/content/recipes/`, write the Zod content schema from SPEC.md section 2, and get a green build with all 19 recipes loaded. Don't build any pages yet.

---

## פרומפטים להמשך

אחרי כל שלב, פשוט:

> continue

אם משהו לא נראה טוב בטלפון:

> On my phone at 375px width, [what's wrong]. Fix it and show me a screenshot at that width.

כשמגיעים לשלב 8 (פריסה):

> Deploy to Vercel. Use the Vercel CLI, walk me through login if needed, and give me the live URL.
