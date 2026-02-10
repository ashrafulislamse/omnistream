/**
 * OmniStream — Assign Admin Role
 * 
 * Usage:
 *   APPWRITE_PROJECT_ID=omnistream \
 *   APPWRITE_API_KEY=your_key \
 *   ADMIN_EMAIL=your@email.com \
 *   node assign-admin.cjs
 * 
 * This script:
 *   1. Finds the user by email in Appwrite Auth
 *   2. Creates a document in user_roles collection with role = "admin"
 *   3. Updates the user's preferences with role = "admin"
 */

const { Client, Databases, Users, Query, ID } = require('node-appwrite');

const CONFIG = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: 'omnistream',
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

if (!CONFIG.projectId || !CONFIG.apiKey) {
    console.error('\n❌ Missing credentials!');
    console.error('  Set APPWRITE_PROJECT_ID and APPWRITE_API_KEY\n');
    process.exit(1);
}

if (!ADMIN_EMAIL) {
    console.error('\n❌ Missing ADMIN_EMAIL!');
    console.error('  Set ADMIN_EMAIL=your@email.com\n');
    process.exit(1);
}

const client = new Client();
client.setEndpoint(CONFIG.endpoint).setProject(CONFIG.projectId).setKey(CONFIG.apiKey);

const databases = new Databases(client);
const users = new Users(client);

async function assignAdmin() {
    console.log(`\n👑 Assigning admin role to: ${ADMIN_EMAIL}\n`);

    // 1. Find user by email
    let userId;
    try {
        const userList = await users.list([Query.equal('email', ADMIN_EMAIL)]);
        if (userList.total === 0) {
            console.error('❌ No user found with that email.');
            console.error('   Make sure they have signed up first!\n');
            process.exit(1);
        }
        userId = userList.users[0].$id;
        console.log(`   ✅ Found user: ${userId}`);
    } catch (err) {
        console.error('❌ Failed to search users:', err.message);
        process.exit(1);
    }

    // 2. Add to user_roles collection
    try {
        // Check if role already exists
        const existing = await databases.listDocuments(
            CONFIG.databaseId,
            'user_roles',
            [Query.equal('user_id', userId), Query.equal('role', 'admin')]
        );

        if (existing.total > 0) {
            console.log('   ⚡ Admin role already exists in database');
        } else {
            await databases.createDocument(
                CONFIG.databaseId,
                'user_roles',
                ID.unique(),
                { user_id: userId, role: 'admin' }
            );
            console.log('   ✅ Admin role added to user_roles collection');
        }
    } catch (err) {
        console.error('   ❌ Failed to create role document:', err.message);
    }

    // 3. Update user preferences with role
    try {
        const currentUser = await users.get(userId);
        const prefs = currentUser.prefs || {};
        prefs.role = 'admin';
        await users.updatePrefs(userId, prefs);
        console.log('   ✅ User preferences updated with role: admin');
    } catch (err) {
        console.error('   ❌ Failed to update prefs:', err.message);
    }

    // 4. Also create/update profile if needed
    try {
        const existingProfile = await databases.listDocuments(
            CONFIG.databaseId,
            'profiles',
            [Query.equal('user_id', userId)]
        );

        if (existingProfile.total === 0) {
            await databases.createDocument(
                CONFIG.databaseId,
                'profiles',
                ID.unique(),
                { user_id: userId, role: 'admin', display_name: ADMIN_EMAIL.split('@')[0] }
            );
            console.log('   ✅ Profile created with admin role');
        } else {
            const doc = existingProfile.documents[0];
            await databases.updateDocument(
                CONFIG.databaseId,
                'profiles',
                doc.$id,
                { role: 'admin' }
            );
            console.log('   ✅ Profile updated with admin role');
        }
    } catch (err) {
        console.error('   ❌ Failed to update profile:', err.message);
    }

    console.log('\n🎉 Done! The user is now an admin.\n');
    console.log('They need to log out and log back in for changes to take effect.\n');
}

assignAdmin().catch(err => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
});
