# WORKLOG

A running log of what got built, when, and how to test it. Claude Code appends a new entry at the end of every phase. Newest entries go at the TOP.

Entry format:
```
## [DATE] — Phase N: <name>
**Did:** what changed (files, features)
**Test:** exact steps to verify it works
**Notes:** decisions, gotchas, anything to remember
**Next:** what phase comes next
```

---

<!-- New entries above this line -->

## [YYYY-MM-DD] — Phase 0: Repo + tooling (EXAMPLE — replace me)
**Did:** Scaffolded Vite + React, installed @supabase/supabase-js, added .env.example and src/lib/supabase.js.
**Test:** Run `npm run dev`, open localhost, see the placeholder page. Run `git status` and confirm `.env` is not listed.
**Notes:** anon key goes in .env only; repo is public.
**Next:** Phase 1 — create Supabase project + tickets table.
