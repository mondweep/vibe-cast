# DeFi Learning Journey

A personal learning app for mastering DeFi protocols, LP strategies, and on-chain analytics. Structured as an 8-week intensive program with an AI tutor powered by Claude.

## Features

✅ **Interactive Learning Plan** — 4 phases, 42 tasks, progress tracking  
✅ **AI Tutor** — Claude-powered assistant specialized in the curriculum  
✅ **Resource Library** — 20+ curated links organized by category  
✅ **Progress Persistence** — localStorage by default, optional Supabase sync  
✅ **Privacy-First** — GDPR consent gate, no third-party analytics  
✅ **Dark Monospace Aesthetic** — IBM Plex Mono + Libre Baskerville  

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Inline CSS (no build-time dependencies)
- **Backend:** Node.js API routes with streaming
- **AI:** Anthropic Claude API (3.5-sonnet)
- **Database:** Supabase (optional, lazy-initialized)
- **Deployment:** Vercel

## Project Structure

```
vibe-cast/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with ConsentGate
│   │   ├── page.tsx                # Homepage (LearningPlan)
│   │   ├── privacy/page.tsx        # Privacy policy
│   │   ├── api/
│   │   │   ├── chat/route.ts       # Claude streaming endpoint
│   │   │   └── profile/route.ts    # Learner profile endpoint
│   ├── components/
│   │   ├── LearningPlan.tsx        # Main UI (4 phases, 42 tasks)
│   │   ├── ConsentGate.tsx         # Privacy consent modal
│   │   └── CourseChat.tsx          # AI tutor interface
│   ├── lib/
│   │   ├── constants.ts            # PHASES, RESOURCES, storage keys
│   │   └── supabase.ts             # Lazy-init Supabase client
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_chat_messages.sql
│   │   ├── 002_create_learner_profiles.sql
│   │   └── 003_create_chat_analytics.sql
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials (optional — app works with localStorage only):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Features in Detail

### Learning Plan
- **4 Phases**: Protocol Immersion → On-Chain Data → Network → Thought Leadership
- **42 Tasks**: Organized by week, each with resources and completion tracking
- **Progress Tracking**: Real-time completion percentage with visual indicators
- **Resource Links**: Direct access to Aave, Dune, Nansen, DeBank, etc.

### AI Tutor
- Powered by Claude 3.5-sonnet
- Context-aware answers using the full curriculum
- Streaming responses for interactive experience
- Chat history persisted locally

### Privacy & Consent
- GDPR-compliant consent gate on app load
- No third-party analytics or cookies
- All data stored locally by default
- Optional encrypted Supabase sync (you control credentials)

## Deployment

### To Vercel (Recommended)

1. Push this repo to GitHub
2. Import in Vercel dashboard
3. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy

```bash
git push origin main
```

### To Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `.next` (with `output: standalone`)
5. Add same environment variables
6. Deploy

## Database Setup (Optional)

To enable cloud sync, create a Supabase project:

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Run migrations in SQL editor:
   - Copy contents of `supabase/migrations/001_create_chat_messages.sql`
   - Copy contents of `supabase/migrations/002_create_learner_profiles.sql`
   - Copy contents of `supabase/migrations/003_create_chat_analytics.sql`
4. Copy your project URL and anon key to `.env.local`

## Usage

### First Visit
1. Read privacy policy
2. Click "I understand, let's learn"
3. Select a phase in the sidebar
4. Check off tasks as you complete them
5. Use the tutor to ask questions

### Saving Progress
- **Local**: Automatic via localStorage (no setup required)
- **Cloud**: Optional via Supabase (requires API key)

### Chat with AI Tutor
- Click any task for context
- Ask questions about protocols, strategies, or resources
- AI responds using curriculum as context

## Development Notes

### Adding New Phases
Edit `src/lib/constants.ts`:
```typescript
{
  id: 5,
  label: "Phase 5",
  title: "Your New Phase",
  // ... rest of phase config
}
```

### Customizing Colors
Modify color values in phase configs:
```typescript
color: "#00C2CB",  // Primary phase color
bg: "#001F22",     // Background color
```

### Extending the AI Tutor
Edit `src/app/api/chat/route.ts`:
- Modify `buildContext()` to include additional resources
- Change model from `claude-3-5-sonnet-20241022` to another Claude model

## Environment Variables Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes (for chat) | Claude API access |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase admin key |

## Privacy & Data

- **Local Storage**: No external requests
- **Supabase**: Only if you configure it (your credentials, your data)
- **Claude API**: Questions sent encrypted to Anthropic per their privacy policy
- **No Third Parties**: No tracking, no ads, no data selling

See [Privacy Policy](/privacy) for full details.

## Support

- GitHub: [mondweep/vibe-cast](https://github.com/mondweep/vibe-cast)
- Contact: [LinkedIn](https://www.linkedin.com/in/mondweepchakravorty/)

## License

Personal learning tool. Not for commercial use without permission.
