# How to Switch to a New Supabase Database

If you've created a new Supabase database but the app is still using the old one, follow these steps:

## Step 1: Update Environment Variables

Edit your `.env.local` file in the project root and update these three variables with your **new** database credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
```

**Where to find these values:**
1. Go to your Supabase dashboard
2. Select your **new** project
3. Go to **Settings** → **API**
4. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy the **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Clear Browser Cookies & Session Data

The browser may have cached authentication cookies from the old database. Clear them:

### Option A: Use the Helper Tool
1. Open `clear-supabase-session.html` in your browser
2. Click "Clear All Supabase Cookies"
3. This will remove all Supabase-related cookies and storage

### Option B: Manual Browser Clear
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Cookies**, find and delete any cookies containing:
   - `sb-` (Supabase cookies)
   - `session_started_at`
   - `last_activity`
   - `session_id`
4. Clear **Local Storage** and **Session Storage** for your domain

### Option C: Clear All Site Data
- **Chrome/Edge**: Settings → Privacy → Clear browsing data → Cookies and site data → Clear data for this site
- **Firefox**: Settings → Privacy & Security → Cookies and Site Data → Clear Data
- **Safari**: Develop → Empty Caches (enable Develop menu first)

## Step 3: Restart Your Development Server

**This is critical!** Next.js loads environment variables when the server starts, so you must restart:

1. Stop your current dev server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Step 4: Hard Refresh Your Browser

Clear the browser cache to ensure it's not using cached JavaScript:

- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

Or use Developer Tools:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Step 5: Verify the Connection

1. Go to your login page
2. Try logging in with credentials from your **new** database
3. If you get errors, check:
   - Browser console for errors (F12 → Console tab)
   - Terminal where your dev server is running for errors
   - That your `.env.local` file has the correct values

## Troubleshooting

### Still seeing old database data?

1. **Double-check `.env.local`**: Make sure the file has the new database URL
2. **Verify server restart**: Check your terminal - did you actually restart the server?
3. **Check for multiple `.env` files**: Make sure you're editing `.env.local`, not `.env.example`
4. **Clear all cookies again**: Use the helper tool or manually clear all cookies
5. **Try incognito/private mode**: This ensures no cached data is used

### Getting "Missing Supabase environment variables" error?

- Make sure your `.env.local` file is in the project root (same folder as `package.json`)
- Make sure variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Restart your dev server after making changes

### Can't log in to new database?

- Make sure you've created a user account in the **new** database
- Run the database schema: Execute `sql/schema.sql` in your new Supabase project's SQL Editor
- Run any migrations in `sql/migrations/` folder

## Quick Checklist

- [ ] Updated `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- [ ] Updated `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Updated `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- [ ] Cleared browser cookies and storage
- [ ] Restarted development server
- [ ] Hard refreshed browser (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Verified login works with new database

## Need Help?

If you're still having issues:
1. Check the browser console for errors
2. Check the terminal where your dev server is running
3. Verify your new database has the correct schema by running `sql/schema.sql`
