# Cloudflare Pages Deployment Guide

## Prerequisites
- A Cloudflare account
- Your Supabase project URL and anon key

## Deployment Steps

### 1. Connect Your Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** > **Create a project**
3. Connect your Git repository (GitHub/GitLab)
4. Select this repository

### 2. Configure Build Settings

Use these exact settings in Cloudflare Pages:

- **Production branch**: `main` (or your default branch)
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave blank if repo root)

### 3. Configure Environment Variables

In Cloudflare Pages project settings, add these environment variables:

| Variable Name | Value | Where to Find |
|---------------|-------|---------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (your anon key) | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_PROJECT_ID` | `your-project-id` | Supabase Dashboard > Settings > General |

**Important**: Make sure to add these for both **Production** and **Preview** environments.

### 4. Deploy

1. Click **Save and Deploy**
2. Cloudflare will automatically build and deploy your app
3. Your app will be available at `https://your-project.pages.dev`

## Build Configuration

The app is already configured for Cloudflare Pages:

✅ **Supabase Client**: Uses `import.meta.env.VITE_*` variables
✅ **Build Output**: Configured to `dist` folder (Vite default)
✅ **SPA Routing**: `_redirects` file ensures all routes work correctly
✅ **Environment Variables**: Ready for Cloudflare Pages environment variable injection

## Verifying Deployment

After deployment, verify:

1. The app loads at your Cloudflare Pages URL
2. You can log in (Supabase auth works)
3. All routes work correctly (thanks to `_redirects`)
4. Environment variables are loaded (check browser console for errors)

## Troubleshooting

### Supabase Connection Errors

If you get Supabase connection errors:
- Verify environment variables are set correctly in Cloudflare Pages
- Check that the Supabase URL and anon key are correct
- Ensure there are no trailing spaces in environment variable values

### 404 Errors on Routes

If you get 404 errors when navigating directly to routes:
- Verify `_redirects` file exists in `public/` folder
- Make sure the build is using the latest code

### Build Failures

If the build fails:
- Check build logs in Cloudflare Pages dashboard
- Ensure `package.json` dependencies are correct
- Try running `npm run build` locally first

## Custom Domain (Optional)

To use your own domain:

1. Go to Cloudflare Pages > Custom domains
2. Add your domain
3. Follow Cloudflare's DNS setup instructions
4. Update your Supabase project's allowed domains:
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add your custom domain to **Site URL** and **Redirect URLs**

## Updating the App

Every time you push to your Git repository:
- Cloudflare Pages will automatically rebuild and deploy
- Preview deployments are created for pull requests
- Production deploys when you merge to main branch

---

**Your app is now ready for Cloudflare Pages deployment!**
