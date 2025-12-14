# Supabase Environment Variables Setup Guide

This guide will help you find all the Supabase environment variables you need for your Contentlify project.

## Required Environment Variables

You need to add these three variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## New vs Legacy API Keys

Supabase has introduced new API keys (Publishable and Secret) to replace the legacy keys (anon and service_role). **Both systems work with this codebase**, so you can choose either:

- **New Keys** (Recommended for new projects): More secure, better for future-proofing
- **Legacy Keys** (Still supported until late 2026): Works fine if you already have them set up

## Where to Find These Values

### Step 1: Log into Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Log in with your account
3. Select your project (or create a new one if you haven't already)

### Step 2: Get Your Project URL

1. In your Supabase project dashboard, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. Under **Project URL**, you'll see your URL (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
4. Copy this entire URL - this is your `NEXT_PUBLIC_SUPABASE_URL`

### Step 3: Choose Your API Keys

You have two options for API keys:

#### Option A: New API Keys (Recommended)

1. In **Settings** → **API**, click on the **"Publishable and secret API keys"** tab
2. **Publishable Key** (replaces anon key):
   - Find the key that starts with `sb_publishable_...`
   - Click **Copy** to copy the entire key
   - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Secret Key** (replaces service_role key):
   - ⚠️ **IMPORTANT**: This key has admin privileges. Keep it secret!
   - Find the key that starts with `sb_secret_...`
   - Click **Copy** to copy the entire key
   - This is your `SUPABASE_SERVICE_ROLE_KEY`

#### Option B: Legacy API Keys (Still Supported)

1. In **Settings** → **API**, click on the **"Legacy anon, service_role API keys"** tab
2. **Anon/Public Key**:
   - Find the **`anon` `public`** key
   - Click the **eye icon** or **reveal** button to show the key
   - Copy the entire key (it's a long JWT token starting with `eyJ...`)
   - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Service Role Key**:
   - ⚠️ **IMPORTANT**: The service role key has admin privileges. Keep it secret and never commit it to version control!
   - Find the **`service_role` `secret`** key
   - Click the **eye icon** or **reveal** button to show the key
   - Copy the entire key (it's a long JWT token starting with `eyJ...`)
   - This is your `SUPABASE_SERVICE_ROLE_KEY`

## Quick Visual Guide

```
Supabase Dashboard
├── Settings (⚙️ icon)
    └── API
        ├── Project URL → NEXT_PUBLIC_SUPABASE_URL
        └── API Keys Tabs
            ├── "Publishable and secret API keys" (New - Recommended)
            │   ├── sb_publishable_... → NEXT_PUBLIC_SUPABASE_ANON_KEY
            │   └── sb_secret_... → SUPABASE_SERVICE_ROLE_KEY
            └── "Legacy anon, service_role API keys" (Still Supported)
                ├── anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
                └── service_role secret → SUPABASE_SERVICE_ROLE_KEY
```

## Setting Up Your .env.local File

1. In your project root directory, create a file named `.env.local` (if it doesn't exist)
2. Add the three variables with your actual values:

**If using New API Keys:**
```env
# Supabase Configuration (New API Keys)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**If using Legacy API Keys:**
```env
# Supabase Configuration (Legacy API Keys)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1MjM0NTIzLCJleHAiOjE5NjA4MTA1MjN9.your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDUyMzQ1MjMsImV4cCI6MTk2MDgxMDUyM30.your-service-role-key-here
```

3. Save the file
4. **Restart your Next.js development server** for the changes to take effect

**Note:** The codebase works with both new and legacy keys. Use whichever you prefer!

## Security Notes

- ✅ **Safe to commit**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (they're public by design, but still use Row Level Security policies)
- ❌ **NEVER commit**: `SUPABASE_SERVICE_ROLE_KEY` (has admin access and bypasses RLS)
- Make sure `.env.local` is in your `.gitignore` file
- **New API Keys**: The publishable key is designed to be safer for client-side use, but you should still have RLS policies enabled
- **Legacy Keys**: The anon key is safe for browser use if RLS is properly configured

## Next Steps

After setting up your environment variables:

1. **Run the database schema**: Execute the SQL in `sql/schema.sql` in your Supabase SQL Editor
2. **Run migrations**: Execute any SQL files in `sql/migrations/` folder
3. **Set up Storage buckets** (if needed): Go to Storage in Supabase dashboard and create any required buckets
4. **Test the connection**: Start your dev server and try logging in

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure your `.env.local` file is in the project root (same level as `package.json`)
- Make sure variable names are exactly as shown (case-sensitive)
- Restart your dev server after adding/changing environment variables

### Can't find the API keys
- Make sure you're in the correct project
- Check that you have the right permissions (project owner/admin)
- Try refreshing the page

### Service role key not working
- Make sure you copied the entire key (they're very long)
- Make sure there are no extra spaces or line breaks
- Check that you're using `SUPABASE_SERVICE_ROLE_KEY` (not `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`)
- If using new keys, make sure you copied the `sb_secret_...` key, not the `sb_publishable_...` key

### Which API keys should I use?
- **New projects**: Use the new "Publishable and secret API keys" (recommended)
- **Existing projects**: Legacy keys work fine until late 2026, but consider migrating for better security
- **Both work**: This codebase supports both key formats - choose what works best for you
