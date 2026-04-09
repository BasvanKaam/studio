# Nerdio Content Studio

L&D content generation for Nerdio University. Generates lessons, ADDIE documents, and video scripts using the Anthropic API — with streaming output, browser history, and branded `.docx` download.

## Workflows

- **Lesson builder** — complete lesson in Nerdio house style
- **ADDIE document** — full five-phase instructional design document
- **Video script** — structured voice-over + screen recording script

---

## Setup — local development

### 1. Install dependencies

```bash
npm install
```

### 2. Add your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and replace `your-api-key-here` with your Anthropic API key.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Under **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
4. Select **Deploy**

Every push to `main` triggers an automatic redeploy.

---

## Updating the system prompt

The full Nerdio L&D style guide and all content rules live in one file:

```
system-prompt.md
```

To update the app behaviour (add a new rule, update terminology, change a workflow spec):

1. Open `system-prompt.md` on GitHub
2. Edit the file directly in the GitHub UI
3. Commit — Vercel redeploys automatically within ~30 seconds

No code changes needed. No developer required.

---

## Project structure

```
app/
  page.tsx                  ← full UI (workflow selector, form, streaming output, history)
  layout.tsx                ← root layout
  globals.css               ← Nerdio brand styles (navy/teal/Poppins)
  api/
    generate/route.ts       ← streaming Anthropic API call
    download/route.ts       ← branded .docx generation and download
lib/
  workflows.ts              ← workflow definitions, fields, and user prompts
system-prompt.md            ← full Nerdio L&D style guide — EDIT THIS to update behaviour
.env.example                ← environment variable template
```

## Notes

- The API key is **never** in the code — Vercel environment variable only
- Output streams to the browser in real time with phase indicators
- History is stored in the browser (localStorage) — per user, per device, max 20 items
- Clicking a history item restores the full output and fields
