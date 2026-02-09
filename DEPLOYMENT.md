# 🚀 Deployment Guide

## Prerequisites

- ✅ Supabase project set up with all migrations applied
- ✅ GitHub account
- ✅ Vercel account (free tier works)

## Step 1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Virtuoso app ready for deployment"
```

## Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it `virtuoso` (or your preferred name)
3. Keep it public or private (your choice)
4. **Do NOT initialize with README** (we already have one)

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/mzhao1599/virtuoso.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Option A: Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `virtuoso` repository
4. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   ```

6. Click **"Deploy"**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL

# Deploy to production
vercel --prod
```

## Step 5: Update Supabase Redirect URLs

After deployment, add your Vercel URL to Supabase allowed redirect URLs:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > URL Configuration**
3. Add to **Redirect URLs:**
   ```
   https://your-app.vercel.app/auth/callback
   ```
4. Add to **Site URL:**
   ```
   https://your-app.vercel.app
   ```

## Step 6: Verify Deployment

✅ Test authentication (Google OAuth)
✅ Create a practice session
✅ Test follow/unfollow
✅ Check leaderboard
✅ Try audio recording
✅ Test private account follow requests

## Continuous Deployment

Every push to `main` branch will automatically trigger a new deployment on Vercel.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key from Supabase | `eyJ...` |
| `NEXT_PUBLIC_SITE_URL` | Your deployed app URL | `https://virtuoso.vercel.app` |

## Troubleshooting

### Build Fails
- Check TypeScript errors: `npm run type-check`
- Check ESLint: `npm run lint`
- Verify all dependencies: `npm install`

### Authentication Not Working
- Verify Supabase environment variables are set
- Check redirect URLs in Supabase dashboard
- Ensure `NEXT_PUBLIC_SITE_URL` matches your Vercel domain

### Database Errors
- Verify all migrations are applied in Supabase
- Check RLS policies are properly configured
- Review Supabase logs in dashboard

## Custom Domain (Optional)

1. Go to your Vercel project settings
2. Click **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed
5. Update Supabase redirect URLs with new domain

---

**🎉 Congratulations! Your Virtuoso app is now live!**
