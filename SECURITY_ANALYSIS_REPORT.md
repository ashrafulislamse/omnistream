# OmniStream - Security & Project Analysis Report

**Generated:** 2026-02-09  
**Project:** OmniStream - TeraBox streaming and download web application

---

## Executive Summary

OmniStream is a React + TypeScript web application with Supabase backend (Edge Functions, Postgres, Storage). It allows users to stream and download content from TeraBox via third-party APIs. Overall, the project demonstrates **good security practices** but has several areas requiring attention.

---

## 🔴 Critical Security Issues

### 1. `.env` File Contains Secrets and is Not in `.gitignore`

**File:** `.env`

**Issue:** The `.env` file contains sensitive Supabase API keys:
```
VITE_SUPABASE_PROJECT_ID="jgjrjvlogegincqlsarn"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://jgjrjvlogegincqlsarn.supabase.co"
```

**Risk:** If committed to version control, these credentials could be exposed.

**Current `.gitignore`:** Does NOT include `.env`

**Recommendation:**
```bash
# Add to .gitignore
.env
.env.*
!.env.example
```

---

### 2. Overly Permissive CORS Configuration

**Files:**
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/terabox-proxy/index.ts`
- `supabase/functions/admin-stats/index.ts`
- All edge functions

**Issue:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ⚠️ Allows any origin
  ...
};
```

**Risk:** Any website can make requests to your Supabase Edge Functions, potentially enabling CSRF or data exfiltration attacks.

**Recommendation:**
```typescript
const ALLOWED_ORIGINS = [
  "https://terastream-vault.lovable.app",
  "http://localhost:8080", // dev only
];

function getCorsHeaders(origin: string) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "...",
  };
}
```

---

### 3. `proxy-thumbnail` and `storage-proxy` Lack Authentication

**Files:**
- `supabase/functions/proxy-thumbnail/index.ts`
- `supabase/functions/storage-proxy/index.ts`

**Issue:** These endpoints proxy arbitrary URLs without authentication:
```typescript
// No auth check before processing
const body = await req.json();
const urls: string[] = Array.isArray(body.urls) ? body.urls.filter(...) : ...;
```

**Risk:** 
- **SSRF (Server-Side Request Forgery):** Attackers can use your server to fetch internal resources
- **Resource exhaustion:** Unlimited thumbnail proxy requests can exhaust storage/bandwidth
- **Cost amplification:** Each request consumes Supabase storage

**Recommendation:**
- Add authentication check
- Implement strict URL allowlist (only `*.terabox.com` domains)
- Add per-IP or per-user rate limiting

---

### 4. `check-link-health` Uses Service Role Without Auth

**File:** `supabase/functions/check-link-health/index.ts`

**Issue:**
```typescript
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);
// No authentication required to trigger this
```

**Risk:** Anyone can trigger this endpoint, potentially causing:
- Database load from querying all favorites
- Outbound requests to arbitrary URLs
- Information disclosure about user data

**Recommendation:** Require admin authentication or use a cron job/scheduled invocation.

---

## 🟠 High-Priority Security Issues

### 5. Weak Session Token Hashing

**File:** `supabase/functions/_shared/redis.ts`

**Issue:**
```typescript
function hashToken(token: string): string {
  // Simple hash for session keys (first 16 chars of base64)
  return btoa(token).slice(0, 16);
}
```

**Risk:** 
- Base64 is NOT a hash, it's reversible encoding
- Truncation to 16 chars increases collision probability
- Session hijacking possible if Redis keys are exposed

**Recommendation:**
```typescript
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
```

---

### 6. Extension Content Script Runs on All URLs

**File:** `extension-starter/manifest.json`

**Issue:**
```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "run_at": "document_start"
  }
]
```

**Risk:** The content script loads on every webpage, which:
- Increases attack surface
- May conflict with other extensions/sites
- Privacy concern: script has access to all pages

**Recommendation:** Limit to TeraBox domains only:
```json
"matches": [
  "https://*.terabox.com/*",
  "https://*.1024terabox.com/*",
  "https://*.teraboxapp.com/*"
]
```

---

### 7. Missing Input Sanitization for `file_data` JSON

**Files:**
- `supabase/functions/extension-api/index.ts`
- Database schema for `fetched_files.file_data`

**Issue:** The `file_data` field stores arbitrary JSON from API responses:
```typescript
await auth.supabase.from("fetched_files").insert({
  ...
  file_data: { pending: true, title: body.title || null },  // User-controlled
});
```

**Risk:** Stored XSS if this data is rendered without sanitization in the frontend.

**Recommendation:** 
- Validate structure before storing
- Sanitize when rendering (React auto-escapes but `dangerouslySetInnerHTML` doesn't)

---

## 🟡 Medium-Priority Issues

### 8. Rate Limiting Uses In-Memory Map (Not Distributed)

**File:** `supabase/functions/terabox-proxy/index.ts`

**Issue:**
```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

**Risk:** Edge functions may run on multiple instances, making in-memory rate limiting ineffective.

**Note:** Other services correctly use Redis for rate limiting. This service should be migrated.

---

### 9. No CSP (Content Security Policy) Headers

**File:** `index.html`

**Issue:** No Content-Security-Policy meta tag or headers.

**Risk:** XSS attacks, inline script injection, and malicious resource loading.

**Recommendation:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co;">
```

---

### 10. Missing Security Headers in Edge Functions

**Issue:** Edge functions don't set security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`

**Recommendation:** Add to all response headers:
```typescript
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
```

---

### 11. Sensitive Data in Download Links

**Issue:** Direct download links (`dlink`, `fast_link`) are stored in the database and may contain:
- Authentication tokens
- Session identifiers
- Temporary access credentials

**Risk:** Links may be logged, shared, or cached inappropriately.

**Recommendation:** Consider not storing full download URLs or implementing link regeneration.

---

## 🟢 Good Security Practices Observed

### ✅ Row-Level Security (RLS) Enabled
All tables have RLS enabled with proper policies:
```sql
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favorites 
  FOR SELECT USING (auth.uid() = user_id);
```

### ✅ Proper Authentication in Most Services
Services like `streaming-service`, `download-service`, and `extension-api` properly authenticate requests:
```typescript
const auth = await authenticateRequest(req);
if (!auth) {
  return errorResponse("Authentication required", 401);
}
```

### ✅ Input Validation with Zod
The Auth page properly validates input:
```typescript
const emailSchema = z.string().trim().email("Invalid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128);
```

### ✅ UUID Validation in Admin Panel
```typescript
const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
```

### ✅ Admin Role Verification
Admin endpoints verify role before allowing actions:
```typescript
const { data: roleData } = await admin
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "admin")
  .maybeSingle();
if (!roleData) return errorResponse("Forbidden", 403);
```

### ✅ Rate Limiting Implementation
Redis-based rate limiting in most services:
```typescript
const rateLimit = await checkRateLimit(auth.user.id, "streaming", RATE_LIMIT, RATE_WINDOW);
if (!rateLimit.allowed) {
  return errorResponse(`Rate limit exceeded...`, 429);
}
```

### ✅ Inactivity Timeout for Sessions
30-minute inactivity timeout with warning:
```typescript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const INACTIVITY_WARNING_SECONDS = 60;
```

### ✅ URL Domain Validation
TeraBox URLs are validated before processing:
```typescript
const validDomains = ["terabox.com", "1024terabox.com", "teraboxapp.com", "1024tera.com"];
if (!validDomains.some((d) => parsedUrl.hostname.endsWith(d))) {
  return errorResponse("Only TerraBox URLs are supported", 400);
}
```

### ✅ Signup Disable Feature
Admin can disable new registrations via `app_settings` table.

### ✅ Secure Password Storage
Using Supabase Auth (bcrypt) for password hashing.

---

## 📋 Code Quality Issues

### 1. Duplicate State Updates
**File:** `src/hooks/useTeraBox.ts` (lines 84-94)

```typescript
setLoading(true);
setError(null);
setData(null);
setFromCache(false);
setCacheSource(null);
setCacheAge(null);

setLoading(true);  // Duplicate
setError(null);    // Duplicate
setData(null);     // Duplicate
setFromCache(false); // Duplicate
```

### 2. Empty Catch Blocks
Multiple empty catch blocks hide errors:
```typescript
} catch { /* clipboard not available */ }
```

### 3. Any Type Usage
Multiple uses of `any` type reduce type safety:
```typescript
const file = (cached.files as any[]).find(f => f.fs_id === fileId);
```

### 4. Missing Error Boundaries
No React Error Boundaries for graceful error handling.

---

## 📦 Dependency Security

### Recommended Actions:
1. Run `npm audit` regularly
2. Update dependencies with known vulnerabilities
3. Consider using `npm audit fix` or Dependabot

---

## 🚀 Recommendations Summary

### Immediate Actions (Critical):
1. ✅ Add `.env` to `.gitignore`
2. ✅ Restrict CORS origins to production domains
3. ✅ Add authentication to `proxy-thumbnail` and `storage-proxy`
4. ✅ Secure `check-link-health` with admin auth

### Short-Term (1-2 weeks):
5. ✅ Implement proper SHA-256 token hashing
6. ✅ Limit extension content script scope
7. ✅ Add CSP headers
8. ✅ Add security headers to all Edge Functions

### Long-Term:
9. ✅ Migrate `terabox-proxy` rate limiting to Redis
10. ✅ Add comprehensive logging and monitoring
11. ✅ Implement security audit logging
12. ✅ Add automated security scanning in CI/CD

---

## Appendix: Files Reviewed

| Category | Files |
|----------|-------|
| **Configuration** | `.env`, `.gitignore`, `package.json`, `vite.config.ts` |
| **Edge Functions** | `terabox-proxy`, `streaming-service`, `download-service`, `admin-stats`, `extension-api`, `proxy-thumbnail`, `storage-proxy`, `check-link-health` |
| **Shared Modules** | `_shared/auth.ts`, `_shared/cors.ts`, `_shared/redis.ts` |
| **Frontend Auth** | `AuthContext.tsx`, `Auth.tsx` |
| **Database** | All migration files |
| **Extension** | `manifest.json`, content scripts |

---

*This report was generated by automated analysis and manual review. It is recommended to conduct a professional penetration test before production deployment.*
