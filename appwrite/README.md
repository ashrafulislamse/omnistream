# 🚀 OmniStream — Appwrite Functions Deployment Guide

## Overview

OmniStream uses **2 Appwrite Functions** to power the entire backend:

| Function | Purpose | Routes |
|----------|---------|--------|
| **cloud-service** | TeraBox + Google Drive streaming & downloads | `stream`, `download`, `ping` |
| **platform-api** | Auth, Admin, Extension, Storage, Link Health | `auth`, `admin`, `extension`, `storage`, `link-health`, `ping` |

```
appwrite/
├── appwrite.json          ← Project config (functions + database schema)
├── README.md              ← You are here
└── functions/
    ├── _shared/           ← Shared utilities (auto-included, not deployed separately)
    │   ├── auth.js        ← Appwrite auth (session validation, admin client)
    │   ├── redis.js       ← Upstash Redis caching layer
    │   ├── utils.js       ← CORS, URL detection, response helpers
    │   └── gdrive.js      ← Google Drive API integration
    ├── cloud-service/     ← Function #1
    │   ├── package.json
    │   └── src/index.js
    └── platform-api/      ← Function #2
        ├── package.json
        └── src/index.js
```

---

## Prerequisites

Before deploying, you need:

1. **Appwrite Account** — Sign up at [cloud.appwrite.io](https://cloud.appwrite.io)
2. **Appwrite CLI** — Install globally
3. **Upstash Redis** — For caching ([upstash.com](https://upstash.com))
4. **TeraBox API Key** — From [xapiverse.com](https://xapiverse.com)
5. **Google API Key** _(optional)_ — For Google Drive support

---

## Step 1: Install & Login to Appwrite CLI

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login with your Appwrite account
appwrite login
```

---

## Step 2: Create Appwrite Project

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io)
2. Click **"Create Project"**
3. Name it **"OmniStream"**
4. Copy the **Project ID** (looks like `67xxxxxxxxxxxx`)
5. Update `appwrite/appwrite.json` — set `"projectId"` to your ID
6. Update `.env` in the root:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your_project_id_here
   VITE_APPWRITE_DATABASE_ID=omnistream
   ```

---

## Step 3: Create the Database

In Appwrite Console:

1. Go to **Databases** → **Create Database**
2. Set Database ID: `omnistream`, Name: `OmniStream`
3. Create these collections (use the exact IDs):

| Collection ID | Name | Purpose |
|---------------|------|---------|
| `profiles` | User Profiles | Display names, avatars |
| `favorites` | Favorites | Saved files / bookmarks |
| `download_history` | Download History | Download tracking |
| `shared_links` | Shared Links | User-generated share links |
| `shared_cache` | Shared Cache | Cross-user file metadata cache |
| `fetched_files` | Fetched Files | API fetch history |
| `user_roles` | User Roles | Admin/moderator roles |
| `link_health` | Link Health | Download link status tracking |
| `admin_logs` | Admin Logs | Admin action audit log |
| `app_settings` | App Settings | Global configuration |
| `rate_limits` | Rate Limits | Per-user rate limiting |

> 💡 **Tip:** You can also create these via the CLI by running `appwrite deploy --all` from the `appwrite/` directory, but manually creating them gives you more control over attributes and indexes.

---

## Step 4: Set Up Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new **Redis** database (free tier works)
3. Copy the **REST URL** and **REST Token** from the dashboard
4. You'll need these in Step 5

---

## Step 5: Deploy Functions

```bash
# Navigate to the appwrite directory
cd appwrite

# Deploy all functions
appwrite deploy function
```

The CLI will detect both functions from `appwrite.json` and deploy them.

### Set Environment Variables

After deploying, set the environment variables for each function in the **Appwrite Console**:

#### cloud-service (Function #1)
| Variable | Value | Required |
|----------|-------|----------|
| `TERABOX_API_KEY` | Your xAPIverse key | ✅ Yes |
| `TERABOX_API_KEY_2` | Backup key (optional) | ❌ No |
| `TERABOX_API_KEY_3` | Backup key (optional) | ❌ No |
| `TERABOX_PRO_API_KEY` | Pro tier key (optional) | ❌ No |
| `TERABOX_PRO_API_KEY_2` | Pro backup key (optional) | ❌ No |
| `GOOGLE_API_KEY` | Google Cloud API key | ❌ Optional |
| `UPSTASH_REDIS_REST_URL` | From Step 4 | ✅ Yes |
| `UPSTASH_REDIS_REST_TOKEN` | From Step 4 | ✅ Yes |

#### platform-api (Function #2)
| Variable | Value | Required |
|----------|-------|----------|
| `UPSTASH_REDIS_REST_URL` | From Step 4 | ✅ Yes |
| `UPSTASH_REDIS_REST_TOKEN` | From Step 4 | ✅ Yes |
| `THUMBNAIL_BUCKET_ID` | `thumbnails` (or custom) | ❌ No |

> 💡 **How to set variables:** Appwrite Console → Functions → Select function → Settings → Environment Variables

---

## Step 6: Create Storage Bucket (for thumbnails)

1. In Appwrite Console, go to **Storage** → **Create Bucket**
2. Set Bucket ID: `thumbnails`
3. Set permissions: Read access for `any` (public thumbnails)

---

## Step 7: Enable Authentication

1. In Appwrite Console, go to **Auth** → **Settings**
2. Enable **Email/Password** authentication
3. _(Optional)_ Enable **OAuth2** providers (Google, GitHub, etc.)

---

## Step 8: Update Frontend Config

Make sure your `.env` file has the correct values:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=omnistream
```

Then rebuild and deploy your frontend:

```bash
npm run build
```

---

## How the API Routing Works

Both functions use a `route` parameter in the request body to determine which handler to call:

```javascript
// Frontend calls cloud-service for streaming:
await supabase.functions.invoke("cloud-service", {
  body: { route: "stream", url: "https://terabox.com/..." }
});

// Frontend calls platform-api for auth:
await supabase.functions.invoke("platform-api", {
  body: { route: "auth", action: "validate" }
});
```

### cloud-service Routes

| Route | Body Params | Description |
|-------|-------------|-------------|
| `stream` | `{ url, force? }` | Fetch stream URLs from TeraBox/GDrive |
| `download` | `{ url, fs_id?, force? }` | Get download links |
| `ping` | — | Health check |

### platform-api Routes

| Route | Body Params | Description |
|-------|-------------|-------------|
| `auth` | `{ action: "validate\|logout\|profile\|update-profile\|role\|redis-stats\|health" }` | Auth operations |
| `admin` | `{ section: "overview\|users\|recent-activity\|api-monitor", action?: "assign\|remove\|ban\|unban" }` | Admin panel |
| `extension` | `{ action: "health\|auth-check\|add-link\|queue\|stats" }` | Browser extension |
| `storage` | `{ action: "proxy\|stats", urls?: [...] }` | Thumbnail proxy |
| `link-health` | — | Check saved links |
| `ping` | — | Health check |

---

## Google Drive Setup (Optional)

To enable Google Drive support:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Drive API**
3. Create an **API Key** (restrict to Google Drive API)
4. Add the key as `GOOGLE_API_KEY` in the **cloud-service** function environment variables
5. Users can now paste Google Drive share links directly into OmniStream

---

## Troubleshooting

### Function returns "Authentication required"
- Make sure users are logged in before calling the function
- Check that the function's execute permission includes `users`

### "SERVICE_BUSY" errors
- All TeraBox API keys are exhausted — add more keys or wait for cooldown
- Check the admin panel → API Monitor for key status

### Redis connection errors
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Check Upstash dashboard for connection issues

### Google Drive "forbidden" errors
- Make sure the Google Drive file/folder is shared as "Anyone with the link"
- Verify the `GOOGLE_API_KEY` has Google Drive API enabled

---

## Updating Functions

After making code changes, redeploy:

```bash
cd appwrite
appwrite deploy function
```

Or deploy a specific function:

```bash
appwrite deploy function --function-id cloud-service
appwrite deploy function --function-id platform-api
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│              (Vite + TypeScript)                  │
└──────────────────┬──────────────────────────────┘
                   │
        Appwrite SDK (functions.createExecution)
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
┌──────────────┐         ┌──────────────┐
│cloud-service │         │ platform-api │
│              │         │              │
│ • Stream     │         │ • Auth       │
│ • Download   │         │ • Admin      │
│              │         │ • Extension  │
│ TeraBox API ◄┤         │ • Storage    │
│ Google Drive◄┤         │ • Health     │
└──────┬───────┘         └──────┬───────┘
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│ Upstash Redis│         │   Appwrite   │
│  (Caching)   │         │  Database    │
└──────────────┘         └──────────────┘
```
