# MCP Setup for TutorDesk

Set up these MCP servers before your first Claude Code session. They give Claude direct
access to your database, docs, and browser — dramatically reducing back-and-forth.

**Note on timing:** You don't need Supabase yet. The app is being built with mock data
first. Set up the GitHub, Context7, and Playwright servers now. Add the Supabase MCP
server when you're ready for Phase 2.

---

## 1. Context7 MCP ← set up first
Pulls live, version-matched documentation into Claude's context. Prevents hallucinated
API calls for Next.js, shadcn/ui, and dnd-kit.

**Install:**
```bash
claude mcp add --transport stdio context7 -- npx -y @upstash/context7-mcp
```

**What it unlocks:**
- Claude looks up the exact shadcn/ui component API before writing code
- Correct dnd-kit patterns for drag-and-drop (the API changes between versions)
- Works automatically — Claude calls it when it needs docs

---

## 2. GitHub MCP
Connects Claude to your repo for clean commits and issue tracking as you build.

**Install:**
```bash
# Generate a token at github.com/settings/tokens with repo scope first
claude mcp add --transport stdio github \
  --env GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here \
  -- npx -y @modelcontextprotocol/server-github
```

**What it unlocks:**
- "Commit everything we built today with a descriptive message"
- "Create a GitHub issue for this edge case we found"
- "Show me open issues before we start this session"

---

## 3. Playwright MCP
Gives Claude a browser to test the app as it builds. It can click through flows
and verify things actually work — not just that the code compiles.

**Install:**
```bash
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp
```

**What it unlocks:**
- "Open the app, navigate to students, search for Jamie, click through to her profile"
- "Check that adding a new student appears in the list immediately"
- "Take a screenshot of the dashboard so I can see what it looks like"

---

## 4. Supabase MCP ← add this in Phase 2
Skip for now. Add this when you're ready to swap mock data for a real database.

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/sse
# Then run /mcp inside Claude Code to authenticate
```

---

## Verify setup

```bash
claude mcp list
```

You should see context7, github, and playwright listed. Then:

```bash
claude
/mcp
```

All three should show as connected. If any show as failed, re-run the install command.

---

## Project-level config (.mcp.json)

Commit this to your project root so the config travels with the repo:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

Use `${env:GITHUB_TOKEN}` so your token never gets committed.
Set it in your shell profile: `export GITHUB_TOKEN=ghp_your_token_here`

Add the Supabase entry to this file in Phase 2:
```json
"supabase": {
  "transport": "http",
  "url": "https://mcp.supabase.com/sse"
}
```

---

## Recommended Claude Code settings

Add this to `.claude/settings.json` to auto-format every file Claude writes:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```
