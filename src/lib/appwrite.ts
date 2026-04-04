/**
 * Appwrite Client Configuration
 * Central setup for OmniStream's Appwrite backend
 */

import { Client, Account, Databases, Storage, Functions, ID, Query, ExecutionMethod } from 'appwrite';

// ============ Client Setup ============

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { client, ID, Query };

// ============ Database Constants ============

export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnistream';

export const COLLECTIONS = {
    PROFILES: 'profiles',
    FAVORITES: 'favorites',
    DOWNLOAD_HISTORY: 'download_history',
    SHARED_LINKS: 'shared_links',
    SHARED_CACHE: 'shared_cache',
    FETCHED_FILES: 'fetched_files',
    ADMIN_LOGS: 'admin_logs',
    APP_SETTINGS: 'app_settings',
    USER_ROLES: 'user_roles',
    LINK_HEALTH: 'link_health',
} as const;

export const BUCKETS = {
    AVATARS: 'avatars',
    THUMBNAILS: 'thumbnails',
} as const;

export const FUNCTION_IDS = {
    CLOUD_SERVICE: 'cloud-service',
    PLATFORM_API: 'platform-api',
} as const;

// ============ User Types ============

export interface AppwriteUser {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    name: string;
    email: string;
    phone: string;
    emailVerification: boolean;
    phoneVerification: boolean;
    prefs: Record<string, any>;
}

// ============ Appwrite Client Wrapper ============
// This wrapper provides a Supabase-like API for easier migration
// All hooks use this unified interface

/**
 * Query builder that mimics a familiar .from().select().eq() pattern
 * Maps to Appwrite's databases.listDocuments() / createDocument() / etc.
 */
class AppwriteQueryBuilder {
    private collectionId: string;
    private queries: string[] = [];
    private orderField: string | null = null;
    private orderAsc: boolean = true;
    private limitCount: number | null = null;
    private selectFields: string = '*';
    private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private insertData: any = null;
    private updateData: any = null;
    private upsertOptions: any = null;
    private isSingle: boolean = false;
    private isMaybeSingle: boolean = false;
    private returnSelect: string | null = null;

    constructor(collectionId: string) {
        this.collectionId = collectionId;
    }

    /** Map legacy field names to Appwrite system fields */
    private mapField(field: string): string {
        const fieldMap: Record<string, string> = {
            'created_at': '$createdAt',
            'updated_at': '$updatedAt',
            'id': '$id',
        };
        return fieldMap[field] || field;
    }

    select(fields: string = '*') {
        this.operation = 'select';
        this.selectFields = fields;
        return this;
    }

    insert(data: any) {
        this.operation = 'insert';
        this.insertData = data;
        return this;
    }

    update(data: any) {
        this.operation = 'update';
        this.updateData = data;
        return this;
    }

    upsert(data: any, options?: { onConflict?: string }) {
        this.operation = 'upsert';
        this.insertData = data;
        this.upsertOptions = options;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    eq(field: string, value: any) {
        this.queries.push(Query.equal(this.mapField(field), value));
        return this;
    }

    gt(field: string, value: any) {
        this.queries.push(Query.greaterThan(this.mapField(field), value));
        return this;
    }

    gte(field: string, value: any) {
        this.queries.push(Query.greaterThanEqual(this.mapField(field), value));
        return this;
    }

    lt(field: string, value: any) {
        this.queries.push(Query.lessThan(this.mapField(field), value));
        return this;
    }

    lte(field: string, value: any) {
        this.queries.push(Query.lessThanEqual(this.mapField(field), value));
        return this;
    }

    order(field: string, options?: { ascending?: boolean }) {
        this.orderField = this.mapField(field);
        this.orderAsc = options?.ascending ?? true;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    maybeSingle() {
        this.isMaybeSingle = true;
        return this;
    }

    /**
     * Execute the built query and return { data, error, count }
     */
    async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
        try {
            const result = await this.execute();
            resolve(result);
        } catch (err) {
            if (reject) reject(err);
            else resolve({ data: null, error: err, count: null });
        }
    }

    private buildQueries(): string[] {
        const q = [...this.queries];
        if (this.orderField) {
            q.push(this.orderAsc ? Query.orderAsc(this.orderField) : Query.orderDesc(this.orderField));
        }
        if (this.limitCount) {
            q.push(Query.limit(this.limitCount));
        }
        return q;
    }

    private mapDocument(doc: any): any {
        // Map Appwrite's $id → id, $createdAt → created_at for compatibility
        const result: any = { ...doc };
        result.id = doc.$id;
        result.created_at = doc.$createdAt;
        result.updated_at = doc.$updatedAt;
        // Remove Appwrite internal fields
        delete result.$id;
        delete result.$createdAt;
        delete result.$updatedAt;
        delete result.$permissions;
        delete result.$databaseId;
        delete result.$collectionId;
        return result;
    }

    private async execute(): Promise<{ data: any; error: any; count?: number | null }> {
        try {
            switch (this.operation) {
                case 'select': {
                    const response = await databases.listDocuments(DB_ID, this.collectionId, this.buildQueries());
                    const docs = response.documents.map(d => this.mapDocument(d));

                    if (this.isSingle) {
                        if (docs.length === 0) return { data: null, error: { message: 'Row not found' } };
                        return { data: docs[0], error: null, count: response.total };
                    }
                    if (this.isMaybeSingle) {
                        return { data: docs.length > 0 ? docs[0] : null, error: null, count: response.total };
                    }
                    return { data: docs, error: null, count: response.total };
                }

                case 'insert': {
                    const docData = { ...this.insertData };
                    // Remove 'id' if present (Appwrite auto-generates)
                    const docId = docData.id || ID.unique();
                    delete docData.id;

                    const doc = await databases.createDocument(DB_ID, this.collectionId, docId, docData);
                    const mapped = this.mapDocument(doc);

                    if (this.returnSelect) {
                        return { data: mapped, error: null };
                    }
                    return { data: mapped, error: null };
                }

                case 'upsert': {
                    const upsertData = { ...this.insertData };
                    const conflictField = this.upsertOptions?.onConflict;

                    if (conflictField) {
                        // Try to find existing document
                        const conflictFields = conflictField.split(',');
                        const searchQueries = conflictFields.map((f: string) =>
                            Query.equal(f.trim(), upsertData[f.trim()])
                        );

                        try {
                            const existing = await databases.listDocuments(DB_ID, this.collectionId, searchQueries);
                            if (existing.documents.length > 0) {
                                // Update existing
                                const existingDoc = existing.documents[0];
                                delete upsertData.id;
                                const doc = await databases.updateDocument(DB_ID, this.collectionId, existingDoc.$id, upsertData);
                                return { data: this.mapDocument(doc), error: null };
                            }
                        } catch {
                            // Fall through to create
                        }
                    }

                    // Create new document
                    delete upsertData.id;
                    const doc = await databases.createDocument(DB_ID, this.collectionId, ID.unique(), upsertData);
                    return { data: this.mapDocument(doc), error: null };
                }

                case 'update': {
                    // Find documents matching the query, then update
                    const docs = await databases.listDocuments(DB_ID, this.collectionId, this.buildQueries());
                    if (docs.documents.length === 0) {
                        return { data: null, error: { message: 'No documents found to update' } };
                    }
                    const updated = await databases.updateDocument(
                        DB_ID, this.collectionId, docs.documents[0].$id, this.updateData
                    );
                    return { data: this.mapDocument(updated), error: null };
                }

                case 'delete': {
                    // Find documents matching the query, then delete
                    const docs = await databases.listDocuments(DB_ID, this.collectionId, this.buildQueries());
                    for (const doc of docs.documents) {
                        await databases.deleteDocument(DB_ID, this.collectionId, doc.$id);
                    }
                    return { data: null, error: null };
                }

                default:
                    return { data: null, error: { message: `Unknown operation: ${this.operation}` } };
            }
        } catch (err: any) {
            console.error(`[Appwrite] ${this.operation} on ${this.collectionId}:`, err);
            return { data: null, error: { message: err.message || 'Unknown error' } };
        }
    }
}

// ============ Main "supabase" compatible wrapper ============
// This provides a familiar API while using Appwrite under the hood

class AppwriteFunctionsProxy {
    async invoke(functionName: string, options?: { body?: any; method?: string }) {
        try {
            // Parse function name and action (e.g., "auth-helper?action=redis-stats")
            let fnName = functionName;
            let action = '';
            if (functionName.includes('?')) {
                const [name, query] = functionName.split('?');
                fnName = name;
                const params = new URLSearchParams(query);
                action = params.get('action') || '';
            }

            const payload = JSON.stringify({
                ...options?.body,
                ...(action ? { action } : {}),
            });

            const result = await functions.createExecution(
                fnName,
                payload,
                false, // async
                '/', // path
                ExecutionMethod.POST // method
            );

            // Parse the response
            const responseBody = result.responseBody;
            try {
                const data = JSON.parse(responseBody);
                return { data, error: null };
            } catch {
                return { data: responseBody, error: null };
            }
        } catch (err: any) {
            return { data: null, error: { message: err.message || 'Function execution failed' } };
        }
    }
}

class AppwriteAuthProxy {
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        try {
            const name = options?.data?.display_name || email;
            await account.create(ID.unique(), email, password, name);
            // Auto sign-in after signup
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();
            return { data: { user: this.mapUser(user) }, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }

    async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();
            return { data: { user: this.mapUser(user), session: { access_token: 'appwrite-session' } }, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }

    async signOut() {
        try {
            await account.deleteSession('current');
            return { error: null };
        } catch (err: any) {
            return { error: { message: err.message } };
        }
    }

    async getSession() {
        try {
            const user = await account.get();
            const session = await account.getSession('current');
            return {
                data: {
                    session: {
                        user: this.mapUser(user),
                        access_token: session.$id,
                        refresh_token: '',
                        token_type: 'bearer',
                        expires_in: 3600,
                        expires_at: Math.floor(Date.now() / 1000) + 3600,
                    },
                },
                error: null,
            };
        } catch {
            return { data: { session: null }, error: null };
        }
    }

    async getUser() {
        try {
            const user = await account.get();
            return { data: { user: this.mapUser(user) }, error: null };
        } catch {
            return { data: { user: null }, error: null };
        }
    }

    async updateUser(updates: { password?: string; data?: any }) {
        try {
            if (updates.password) {
                await account.updatePassword(updates.password);
            }
            if (updates.data) {
                await account.updatePrefs(updates.data);
            }
            const user = await account.get();
            return { data: { user: this.mapUser(user) }, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }

    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
        try {
            await account.createRecovery(email, options?.redirectTo || window.location.origin + '/reset-password');
            return { data: {}, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }

    onAuthStateChange(callback: (event: string, session: any) => void) {
        // Appwrite doesn't have real-time auth state changes
        // We check the session on mount and set up a listener
        const checkSession = async () => {
            try {
                const user = await account.get();
                const mappedUser = this.mapUser(user);
                callback('SIGNED_IN', {
                    user: mappedUser,
                    access_token: 'appwrite-session',
                    refresh_token: '',
                    token_type: 'bearer',
                    expires_in: 3600,
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                });
            } catch {
                callback('SIGNED_OUT', null);
            }
        };

        checkSession();

        // Return subscription-like object for compatibility
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        // No-op for Appwrite
                    },
                },
            },
        };
    }

    private mapUser(appwriteUser: any): any {
        // Map Appwrite user to compatible user shape
        return {
            id: appwriteUser.$id,
            email: appwriteUser.email,
            app_metadata: {},
            user_metadata: {
                display_name: appwriteUser.name,
                avatar_url: appwriteUser.prefs?.avatar_url,
            },
            aud: 'authenticated',
            role: appwriteUser.prefs?.role || 'user',
            created_at: appwriteUser.$createdAt,
        };
    }
}

// RPC proxy for function calls
class AppwriteRpcProxy {
    async call(functionName: string, params: any) {
        // Map RPC calls to Appwrite function executions
        try {
            const result = await functions.createExecution(
                FUNCTION_IDS.PLATFORM_API,
                JSON.stringify({ route: 'auth', action: functionName, ...params }),
                false,
                '/',
                ExecutionMethod.POST
            );
            const data = JSON.parse(result.responseBody);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }
}

// Main "supabase" compatible wrapper
export const supabase = {
    auth: new AppwriteAuthProxy(),
    functions: new AppwriteFunctionsProxy(),

    from(collection: string) {
        return new AppwriteQueryBuilder(collection);
    },

    rpc(functionName: string, params?: any) {
        const proxy = new AppwriteRpcProxy();
        return proxy.call(functionName, params);
    },
};

export default supabase;
