# 🎵 Virtuoso - Strava for Musicians

A social platform where musicians track practice sessions, share progress, and compete via streaks and leaderboards.

**Core Value Proposition:** Gamifying music practice to build consistency and community.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Backend/Auth/DB:** Supabase (PostgreSQL)
- **Deployment:** Vercel (recommended)

## ✨ Core Features (MVP)

1. **Authentication** - Google OAuth sign-in via Supabase Auth
2. **Practice Logger** - Stopwatch/timer interface to log sessions with:
   - Instrument selection
   - Duration tracking
   - Piece/Song name
   - Practice notes/description
3. **Social Feed** - Chronological feed of your and friends' practice sessions
4. **Follow System** - Follow/unfollow other musicians, view followers/following lists
5. **User Search** - Search for other musicians by username or display name
6. **Engagement** - Give "Kudos" (likes) and comment on sessions
   - Click kudos count to see who gave kudos
   - Click comment button to view/add comments
7. **Leaderboard** - Rankings by practice time, sessions, or practice days
8. **Profile & Stats**:
   - Total practice hours
   - Current streak tracker
   - Session history
   - Followers/following counts
9. **Account Settings**:
   - Public/private account toggle
   - Profile customization (display name, bio, instrument)
   - Privacy controls

## 📦 Project Structure

```
virtuoso/
├── app/                          # Next.js App Router
│   ├── auth/callback/           # OAuth callback handler
│   ├── dashboard/               # Main feed
│   ├── leaderboard/             # Rankings page
│   ├── login/                   # Authentication page
│   ├── profile/[username]/      # User profile pages
│   │   ├── followers/          # Followers list
│   │   └── following/          # Following list
│   ├── session/new/             # Log practice session
│   ├── settings/                # Account settings
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/
│   ├── layout/                  # Layout components (Navbar, AppLayout)
│   ├── leaderboard/             # Leaderboard components
│   ├── profile/                 # Profile components (FollowButton)
│   ├── search/                  # Search components (SearchBar)
│   ├── sessions/                # Session-related components
│   │   ├── feed.tsx            # Feed container
│   │   ├── practice-timer.tsx  # Timer/Logger component
│   │   ├── session-card.tsx    # Session display card
│   │   ├── comments-modal.tsx  # Comments modal
│   │   └── kudos-modal.tsx     # Kudos list modal
│   ├── settings/                # Settings components (SettingsForm)
│   └── ui/                      # Shadcn UI primitives
├── lib/
│   ├── actions/                 # Server Actions
│   │   ├── auth.ts             # Authentication actions
│   │   ├── profile.ts          # Profile & stats actions
│   │   └── sessions.ts         # Session CRUD actions
│   ├── supabase/                # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   └── utils.ts                 # Utility functions
├── src/types/                   # TypeScript definitions
│   └── index.ts                 # All types (mirrors DB schema)
├── supabase/
│   ├── migrations/              # Database migrations
│   │   └── 001_add_social_features.sql
│   └── schema.sql               # Database schema
└── middleware.ts                # Auth middleware

```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd virtuoso
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to provision (~2 minutes)

#### Run the Database Schema

1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the SQL to create all tables, policies, and functions

#### Configure Google OAuth

1. In Supabase Dashboard → Authentication → Providers
2. Enable "Google" provider
3. Follow the instructions to set up Google OAuth:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get these values from:
- Supabase Dashboard → Settings → API

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Database Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase auth.users) |
| `sessions` | Practice session logs |
| `follows` | Social graph (who follows whom) |
| `kudos` | Likes on sessions |
| `comments` | Comments on sessions |

### Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Auto-profile creation** via trigger on user signup
- **Optimized indexes** for feed queries
- **Views** for aggregated stats (`user_stats`, `sessions_with_counts`)

See `supabase/schema.sql` for full details.

## 📝 Type Safety

All database types are defined in `src/types/index.ts` and mirror the Supabase schema exactly. The `Database` interface is used throughout the app for type-safe queries.

## 🎨 UI Components

Built with **Shadcn/UI** (Radix UI primitives + Tailwind CSS):

- `Button`, `Card`, `Avatar` - Base UI components
- `SessionCard` - Displays practice sessions with engagement
- `PracticeTimer` - Stopwatch interface for logging sessions
- `Navbar` - Main navigation with user dropdown
- `Feed` - Displays list of sessions with interactivity

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project to [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your production URL)
4. Deploy!

### Update Google OAuth Redirect

After deployment, add your production URL to:
- Google Cloud Console → OAuth credentials → Authorized redirect URIs
- Add: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

## 🧪 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🗺️ Roadmap / Future Features

- [x] Leaderboard page
- [x] Search & discover users
- [x] Follow/unfollow system
- [x] Account privacy settings
- [x] Comment threads on sessions
- [x] See who gave kudos
- [ ] Calendar heat map visualization
- [ ] Audio attachment upload for sessions
- [ ] Practice goals & reminders
- [ ] Weekly/monthly stats reports
- [ ] Badges & achievements
- [ ] Dark/light theme toggle

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for musicians who want to stay consistent and motivated.
