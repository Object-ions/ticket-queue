# Kickoff prompt for Claude Code

Paste this as your FIRST message to Claude Code, once the starter files are in the repo folder.

---

```
Read CLAUDE.md and PLAN.md fully before doing anything.

This is a phased build. Execute PHASE 0 ONLY (Repo + tooling). Do not start Phase 1.

When Phase 0 is complete:
1. Append a new entry to the top of WORKLOG.md following the format in that file.
2. Commit with a clear message.
3. Give me a short summary of what you did and the exact steps to test it.
4. STOP and wait for me to say "go" before starting the next phase.

Rules you must follow:
- Never put secrets in any committed file. .env is gitignored; only .env.example is committed.
- The service_role key must never appear anywhere in the code or repo. Frontend uses the anon key from env only.
- This is a learning project — write clear code and add short comments on non-obvious parts.
```

---

## For every phase after Phase 0

When Phase 0 is done and tested, just say:

```
go — start the next phase. Same rules: one phase only, update WORKLOG.md, commit, summarize, then stop.
```

## When you hit a 👤 MANUAL step

PLAN.md marks some steps as manual (creating the Supabase project, running SQL, creating the shared login user). Claude Code will pause and tell you exactly what to do in the Supabase dashboard. Do it, then tell Claude Code you're done and it continues.
