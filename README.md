# CampusOne

Student clubs list what they can offer, find each other, and run events together.
Built by Team CodeCrunchers.

## Run it

| Command | What you get |
| --- | --- |
| `npm run dev` | **Demo mode** (no keys): everything runs in the browser on seed data. Good for screenshots. |
| `npm run dev:local` | **Full backend, locally** (no accounts needed): real Firebase Auth + Firestore via the emulators, all API routes, seeded data. App on http://localhost:3000, data browser on http://127.0.0.1:4000. |
| `npm run dev` with `.env.local` filled | **Production backend**: your real Firebase project, plus Gemini/Claude, Gmail and Google Calendar if those keys are set. |

`dev:local` uses the portable Java 21 in `.tools/jdk` (download one from adoptium.net into that folder on a new machine, or install Java 21+).
When you click "Continue with Google" the emulator lets you type any email. Use:

- `vaibhav.04816401525@std.ggsipu.ac.in` → admin of **Coding Club** (host)
- `rohan.01916401525@std.ggsipu.ac.in` → admin of **CyberSec Society** (partner)

Use two browser windows (one normal, one private) to play both sides of the demo.

## Tests

```bash
npm run verify:seed       # Trust Passport numbers for the three demo archetypes
npm run verify:matching   # matching engine on the demo sentence
npm run test:e2e          # full API flow against dev:local (run dev:local first)
npm run test:e2e:real     # same flow against your real Firebase (run `npm run dev` first); uses throwaway users and restores the seed
```

## Notes

- Without an LLM key, parsing, ranking, invites and task plans use built-in rules; with `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` they use AI.
- Seeded club contacts use `club.<name>@std.ggsipu.ac.in` placeholder inboxes, which the app never emails.
- Deploy production with your own Firebase project: fill `.env.local`, `npm run seed:reset`, deploy `firestore.rules` + `firestore.indexes.json`, then `npx vercel --prod`.
