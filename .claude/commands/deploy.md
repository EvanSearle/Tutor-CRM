Deploy TutorDesk to Vercel by following these steps in order. Stop and report to the user if any step fails.

1. **TypeScript check** — run `npx tsc --noEmit` in the project root. If there are errors, list them and stop. Do not deploy with TypeScript errors.

2. **Build check** — run `npm run build`. If the build fails, show the error and stop.

3. **Confirm with user** — before deploying, tell the user:
   - The branch that will be deployed (run `git branch --show-current`)
   - Any uncommitted changes (run `git status --short`)
   - Ask: "Ready to deploy to Vercel?" and wait for confirmation.

4. **Deploy** — run `npx vercel --prod`. Stream the output so the user can see progress. When done, show the deployment URL.

5. **Done** — confirm the deployment succeeded and show the live URL.
