# 🚀 Quick Start Guide

## Prerequisites Checklist

- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ Git initialized (optional)
- ⬜ Supabase account
- ⬜ Google Cloud Console account (for OAuth)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** virtuoso (or your choice)
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
4. Wait ~2 minutes for provisioning

### 2.2 Run the Database Schema

1. In Supabase Dashboard → SQL Editor
2. Open `supabase/schema.sql` in this project
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. You should see "Success. No rows returned"

### 2.3 Run Social Features Migration

1. In Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/001_add_social_features.sql` in this project
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. You should see "Success. No rows returned"

This migration adds:
- Account privacy settings (public/private)
- Updated RLS policies for privacy control

### 2.4 Run Session Details Migration

1. In Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/002_add_session_details.sql` in this project
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. You should see "Success. No rows returned"

This migration adds:
- Skills practiced field
- Focus, entropy, and enjoyment indicators

### 2.5 Enable Google OAuth

1. Supabase Dashboard → Authentication → Providers
2. Find "Google" and toggle it ON
3. Keep this tab open (you'll need to paste credentials here)

## Step 3: Set Up Google OAuth

### 3.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (dropdown at top)
3. Name it "Virtuoso" or similar

### 3.2 Enable Google+ API

1. In Google Cloud Console → APIs & Services → Library
2. Search for "Google+ API"
3. Click it → Enable

### 3.3 Create OAuth Credentials

1. APIs & Services → Credentials
2. Click "+ CREATE CREDENTIALS" → OAuth client ID
3. Configure consent screen if prompted:
   - User Type: **External**
   - App name: **Virtuoso**
   - User support email: (your email)
   - Developer contact: (your email)
   - Save
4. Back to Credentials → Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Virtuoso**
   - Authorized redirect URIs: Add:
     ```
     https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
     ```
     *(Get this from Supabase → Settings → API → Project URL, replace `https://[ref].supabase.co` with above)*
   - Click "Create"
5. **Copy** Client ID and Client Secret

### 3.4 Add Credentials to Supabase

1. Back in Supabase → Authentication → Providers → Google
2. Paste:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
3. Click "Save"

## Step 4: Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Copy the example
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Get these values from:**
- Supabase Dashboard → Settings → API
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - Project API keys → `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the Setup

### 1. Landing Page
- You should see the Virtuoso landing page
- Click "Get Started" or "Sign In"

### 2. Sign In
- Click "Continue with Google"
- Authorize with your Google account
- You'll be redirected to `/dashboard`

### 3. Log Your First Session
1. Click "Log Practice" (top right)
2. Start the timer
3. Let it run for 10+ seconds
4. Stop it
5. Fill in:
   - Instrument: Piano (or any)
   - Piece Name: "Moonlight Sonata" (or any)
   - Notes: "Worked on first movement"
6. Click "Save Session"

### 4. View Your Feed
- You'll be redirected to `/dashboard`
- Your session should appear in the feed
- Try clicking the heart (kudos)

### 5. View Your Profile
- Click your avatar (top right) → Profile
- You should see:
  - Your stats (1 session, practice time)
  - Your recent sessions

## Troubleshooting

### "Not authenticated" errors
- Make sure you're signed in
- Check browser console for errors
- Verify Supabase URL and anon key in `.env.local`

### Google OAuth not working
- Verify redirect URI in Google Cloud Console matches Supabase exactly
- Check Supabase → Authentication → Providers → Google is enabled
- Try incognito mode (clear auth state)

### Database errors
- Verify you ran the ENTIRE `schema.sql` in Supabase
- Check Supabase logs: Dashboard → Logs
- Make sure RLS policies were created

### Build errors
```bash
# Clean and reinstall
rm -rf .next node_modules
npm install
npm run build
```

## Next Steps

Once everything works locally:

1. **Deploy to Vercel:**
   - Connect your GitHub repo
   - Add environment variables (same as `.env.local`)
   - Set `NEXT_PUBLIC_SITE_URL` to your production URL

2. **Update Google OAuth:**
   - Add production URL to authorized redirect URIs in Google Cloud Console

3. **Test in Production:**
   - Try signing in on production
   - Log a session
   - Verify everything works

## Project Structure

```
virtuoso/
├── app/                    # Next.js pages
│   ├── dashboard/         # Main feed
│   ├── profile/[username] # User profiles
│   ├── session/new/       # Log practice
│   └── login/             # Auth page
├── components/            # React components
│   ├── layout/           # Navbar, Layout
│   ├── sessions/         # Timer, SessionCard, Feed
│   └── ui/               # Shadcn components
├── lib/
│   ├── actions/          # Server Actions (auth, sessions, profile)
│   ├── supabase/         # Supabase clients
│   └── utils.ts          # Utilities
├── src/types/            # TypeScript types
└── supabase/schema.sql   # Database schema
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Complete database schema |
| `src/types/index.ts` | All TypeScript types |
| `middleware.ts` | Auth middleware |
| `lib/actions/` | Server-side CRUD operations |

## Support

If you get stuck:
1. Check [README.md](README.md) for detailed docs
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify environment variables are set correctly

---

**You're all set!** 🎵 Start tracking your practice sessions!
