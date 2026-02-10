# TerraStream: Supabase → Appwrite Migration Plan

## Overview
Migrate TerraStream from Lovable's managed Supabase to our own Appwrite Pro account for full control, better limits, and data ownership.

---

## Phase 1: Appwrite Project Setup (Day 1)

### 1.1 Create Appwrite Project
- Create new project in Appwrite Console
- Set up custom domain (if needed)
- Configure platform (Web) with allowed domains

### 1.2 Create Database & Collections
Map existing Supabase tables → Appwrite collections:

| Supabase Table | Appwrite Collection | Attributes |
|---|---|---|
| `profiles` | `profiles` | userId, displayName, email, avatarUrl, isPremium, createdAt |
| `favorites` | `favorites` | userId, fileName, fileSize, fileType, sourceUrl, thumbnailUrl, createdAt |
| `download_history` | `download_history` | userId, fileName, fileSize, fileType, downloadLink, status, createdAt |
| `shared_links` | `shared_links` | userId, shortCode, sourceUrl, title, viewCount, isActive, expiresAt, createdAt |
| `admin_logs` | `admin_logs` | userId, eventType, message, metadata, createdAt |
| `app_settings` | `app_settings` | key, value, updatedAt |

### 1.3 Set Up Indexes
- `profiles`: index on `userId`
- `favorites`: index on `userId`, `createdAt`
- `download_history`: index on `userId`, `createdAt`
- `shared_links`: index on `shortCode`, `userId`
- `admin_logs`: index on `eventType`, `createdAt`

### 1.4 Set Up Permissions
Each collection needs permission rules:
- `profiles`: User can read/write own document
- `favorites`: User can CRUD own documents
- `download_history`: User can read own, create new
- `shared_links`: User can CRUD own, anyone can read (for public shares)
- `admin_logs`: Only admin role can read/write
- `app_settings`: Admin write, authenticated read

---

## Phase 2: Auth Migration (Day 1-2)

### 2.1 Replace Supabase Auth with Appwrite Auth

**Current (Supabase):**
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.auth.signUp({ email, password });
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
const { data } = await supabase.auth.getUser();
await supabase.auth.signOut();
```

**New (Appwrite):**
```typescript
import { account } from '@/lib/appwrite';
const user = await account.create(ID.unique(), email, password, name);
const session = await account.createEmailPasswordSession(email, password);
const user = await account.get();
await account.deleteSession('current');
```

### 2.2 Files to Modify
- `src/integrations/supabase/client.ts` → `src/lib/appwrite.ts`
- `src/contexts/AuthContext.tsx` — Replace all Supabase auth calls
- `src/hooks/useAuth.ts` (if exists)

### 2.3 OAuth Providers
Set up in Appwrite Console:
- Google OAuth (for Google Drive integration)
- GitHub (optional)

---

## Phase 3: Database Migration (Day 2-3)

### 3.1 Replace Supabase Database Calls

**Current (Supabase):**
```typescript
// Read
const { data } = await supabase.from('favorites').select('*').eq('user_id', userId);

// Create
const { data } = await supabase.from('favorites').insert({ user_id: userId, file_name: name });

// Update
await supabase.from('favorites').update({ file_name: newName }).eq('id', id);

// Delete
await supabase.from('favorites').delete().eq('id', id);
```

**New (Appwrite):**
```typescript
import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

const DB_ID = 'terastream';

// Read
const { documents } = await databases.listDocuments(DB_ID, 'favorites', [
  Query.equal('userId', userId)
]);

// Create
await databases.createDocument(DB_ID, 'favorites', ID.unique(), {
  userId, fileName: name
});

// Update
await databases.updateDocument(DB_ID, 'favorites', docId, { fileName: newName });

// Delete
await databases.deleteDocument(DB_ID, 'favorites', docId);
```

### 3.2 Files to Modify
All files that import from `@/integrations/supabase`:
- All page components that fetch data
- All hooks that use Supabase queries
- Admin panel queries

---

## Phase 4: Edge Functions → Appwrite Functions (Day 3-5)

### 4.1 Function Migration Map

| Supabase Function | Appwrite Function | Runtime |
|---|---|---|
| `streaming-service` | `streaming-service` | Node.js 18 |
| `download-service` | `download-service` | Node.js 18 |
| `terabox-proxy` | `terabox-proxy` | Node.js 18 |
| `admin-stats` | `admin-stats` | Node.js 18 |
| `auth-helper` | (built into Appwrite) | N/A |
| `storage-proxy` | `storage-proxy` | Node.js 18 |
| `proxy-thumbnail` | `proxy-thumbnail` | Node.js 18 |
| `check-link-health` | `check-link-health` | Node.js 18 |
| `extension-api` | `extension-api` | Node.js 18 |

### 4.2 Function Template (Appwrite)

```javascript
// Each function follows this pattern:
import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.send('', 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  try {
    // Your logic here...
    return res.json({ success: true, data: {} });
  } catch (err) {
    error(err.message);
    return res.json({ error: err.message }, 500);
  }
};
```

### 4.3 Redis Caching
Keep Upstash Redis — it works independently of Supabase/Appwrite.
Just update the function environment variables.

### 4.4 Environment Variables (Appwrite Functions)
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
TERABOX_API_KEY=your_key
TERABOX_API_KEY_2=your_key_2
TERABOX_API_KEY_3=your_key_3
TERABOX_PRO_API_KEY=your_pro_key
TERABOX_PRO_API_KEY_2=your_pro_key_2
```

---

## Phase 5: Frontend Client Setup (Day 1)

### 5.1 Install Appwrite SDK
```bash
npm install appwrite
```

### 5.2 Create Appwrite Client
**New file: `src/lib/appwrite.ts`**

```typescript
import { Client, Account, Databases, Storage, Functions, ID, Query } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { client, ID, Query };

// Database & Collection IDs
export const DB_ID = 'terastream';
export const COLLECTIONS = {
  PROFILES: 'profiles',
  FAVORITES: 'favorites',
  DOWNLOAD_HISTORY: 'download_history',
  SHARED_LINKS: 'shared_links',
  ADMIN_LOGS: 'admin_logs',
  APP_SETTINGS: 'app_settings',
} as const;
```

### 5.3 Environment Variables
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
```

---

## Phase 6: Storage Migration (Day 4)

### 6.1 File Storage
- Create bucket: `thumbnails` (for cached thumbnails)
- Create bucket: `avatars` (for user profile pics)
- Set permissions accordingly

### 6.2 Storage API Changes
```typescript
// Upload
const file = await storage.createFile('avatars', ID.unique(), fileInput);

// Get file URL
const url = storage.getFilePreview('avatars', fileId, 200, 200);

// Delete
await storage.deleteFile('avatars', fileId);
```

---

## Phase 7: Testing & Deployment (Day 5-6)

### 7.1 Testing Checklist
- [ ] User signup/login/logout
- [ ] Google OAuth login
- [ ] Add/remove favorites
- [ ] Stream video from TeraBox
- [ ] Download files
- [ ] Share links (create & view)
- [ ] View download history
- [ ] Admin panel stats
- [ ] Profile update
- [ ] Thumbnail loading
- [ ] Redis caching working
- [ ] Rate limiting working
- [ ] API key rotation working

### 7.2 Deployment
- Deploy Appwrite Functions via CLI: `appwrite deploy function`
- Update frontend env variables
- Deploy frontend to Vercel/Netlify/Cloudflare

---

## Migration Timeline

| Day | Task | Status |
|-----|------|--------|
| Day 1 | Appwrite setup + Auth migration | ⬜ |
| Day 2 | Database collections + Auth testing | ⬜ |
| Day 3 | Database queries migration | ⬜ |
| Day 4 | Edge Functions → Appwrite Functions (1-4) | ⬜ |
| Day 5 | Edge Functions → Appwrite Functions (5-9) | ⬜ |
| Day 6 | Storage + Testing + Deploy | ⬜ |

---

## Files to Create/Modify

### New Files
- `src/lib/appwrite.ts` — Appwrite client
- `appwrite/functions/*/` — All Appwrite functions

### Files to Modify
- `src/contexts/AuthContext.tsx` — Auth logic
- All pages/hooks that use `supabase.from()`
- `package.json` — Add `appwrite` dependency

### Files to Delete (after migration)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/` folder (entire)

---

## Risk Mitigation
1. Keep Lovable deployment running during migration
2. Test Appwrite version thoroughly before switching DNS
3. Keep Redis (Upstash) — it's independent and works with both
4. Can rollback by pointing back to Lovable if issues arise
