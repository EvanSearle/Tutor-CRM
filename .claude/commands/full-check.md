Run a full health check on TutorDesk by doing the following two things in sequence:

1. Launch the `browser-tester` agent to test the running app in a real browser. The dev server should already be running — if it's not, tell the user to run `npm run dev` first and stop here.

2. Launch the `code-review` agent to do a static code review of the codebase.

After both finish, summarize the combined results in one concise report:
- What passed in the browser
- Any runtime issues found
- Any code issues found
- An overall verdict: ✅ Ready to deploy / ⚠️ Fix these things first
