# 🔧 Blank Screen Troubleshooting Guide

## Issue: Blank White Screen on Appwrite Deployment

You're seeing a blank screen at `omnistream.appwrite.network` after deployment. Here's how to fix it:

## 🔍 Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for errors like:
   - `Failed to load module` 
   - `404 Not Found` for JS/CSS files
   - `Uncaught SyntaxError`
   - CORS errors

**Take a screenshot of any errors and share them.**

## 🔍 Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Refresh the page
3. Look for failed requests (red status codes)
4. Check if these files are loading:
   - `/assets/index-bHMXl0cl.js` (main JavaScript)
   - `/assets/index-C_WVlhrD.css` (styles)
   - `/manifest.webmanifest` (PWA manifest)

## 🛠️ Common Fixes

### Fix 1: Appwrite Static Hosting Configuration

Appwrite needs to know this is a Single Page Application (SPA). You need to configure it to serve `index.html` for all routes.

**Option A: Using Appwrite Console**
1. Go to Appwrite Console → Your Project
2. Navigate to **Settings** → **Platforms**
3. Add a new **Web App** platform
4. Set the hostname to your domain
5. Enable **SPA Mode** or configure fallback to `index.html`

**Option B: Using appwrite.json**

Add this to your `appwrite/appwrite.json`:

```json
{
  "projectId": "omnistream",
  "projectName": "OmniStream",
  "hosting": {
    "outputDirectory": "../dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": [...],
  "databases": [...]
}
```

### Fix 2: Deploy to Better Static Hosting

Appwrite's static hosting is still in beta. For production, use:

#### Vercel (Recommended - Best for React/Vite)
```bash
npm install -g vercel
vercel --prod
```

Vercel automatically detects Vite and configures SPA routing.

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Create `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Cloudflare Pages
```bash
npm install -g wrangler
wrangler pages deploy dist
```

Cloudflare automatically handles SPA routing.

### Fix 3: Check Environment Variables

The blank screen might be caused by missing environment variables:

1. Go to Appwrite Console → Your Project → Settings
2. Add these environment variables:
   ```
   VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=omnistream
   VITE_APPWRITE_DATABASE_ID=omnistream
   VITE_CLOUD_SERVICE_FN_ID=cloud-service
   VITE_PLATFORM_API_FN_ID=platform-api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

3. Rebuild and redeploy

### Fix 4: Check Base Path

If Appwrite serves your app from a subdirectory, update `vite.config.ts`:

```typescript
export default defineConfig(({ mode }) => ({
  base: '/', // or '/your-subdirectory/' if needed
  // ... rest of config
}));
```

Then rebuild:
```bash
npm run build
```

## 🎯 Recommended Solution

Since you're seeing a blank screen on Appwrite's hosting, I recommend:

### Option 1: Use Vercel (Easiest)
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel --prod`
3. Follow the prompts
4. Your app will be live in ~2 minutes

### Option 2: Fix Appwrite Hosting
1. Check browser console for specific errors
2. Configure SPA routing in Appwrite
3. Ensure all environment variables are set
4. Redeploy

## 📋 Quick Checklist

- [ ] Check browser console for errors
- [ ] Check network tab for 404s
- [ ] Verify environment variables are set
- [ ] Configure SPA routing (rewrites)
- [ ] Try deploying to Vercel/Netlify instead

## 🆘 Need More Help?

Share these details:
1. Screenshot of browser console errors
2. Screenshot of network tab showing failed requests
3. Your Appwrite hosting configuration
4. Whether you're using a custom domain or appwrite.network subdomain

---

**Quick Test:** Try accessing `https://omnistream.appwrite.network/assets/index-bHMXl0cl.js` directly in your browser. If you get a 404, the files aren't being served correctly.
