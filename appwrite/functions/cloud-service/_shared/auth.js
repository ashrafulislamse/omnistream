/**
 * Shared authentication for Appwrite Functions
 * Validates requests using Appwrite's built-in context
 */

const { Client, Users, Databases, Query } = require('node-appwrite');

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'omnistream';

/**
 * Create an admin Appwrite client (using function's API key)
 */
function createAdminClient() {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    return {
        client,
        users: new Users(client),
        databases: new Databases(client),
    };
}

/**
 * Authenticate a request using Appwrite's function context
 * In Appwrite Functions, the userId is passed automatically via context
 */
async function authenticateFromContext(context) {
    const userId = context.req.headers['x-appwrite-user-id'];

    if (!userId) {
        return null;
    }

    const { users, databases } = createAdminClient();

    try {
        const user = await users.get(userId);
        return {
            user: {
                id: user.$id,
                email: user.email,
                name: user.name,
            },
            databases,
            DB_ID,
        };
    } catch (err) {
        console.error('[Auth] User validation failed:', err.message);
        return null;
    }
}

/**
 * Check if a user has admin role
 */
async function isUserAdmin(userId) {
    const { databases } = createAdminClient();

    try {
        const result = await databases.listDocuments(DB_ID, 'user_roles', [
            Query.equal('user_id', userId),
            Query.equal('role', 'admin'),
        ]);
        return result.documents.length > 0;
    } catch {
        return false;
    }
}

module.exports = {
    createAdminClient,
    authenticateFromContext,
    isUserAdmin,
    DB_ID,
};
