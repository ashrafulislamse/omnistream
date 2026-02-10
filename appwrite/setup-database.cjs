/**
 * OmniStream — Appwrite Database Setup Script
 * 
 * Run this ONCE to create all database collections & attributes.
 * 
 * Usage:
 *   1. Set your Appwrite project details below (or use env vars)
 *   2. Run: node setup-database.js
 * 
 * Prerequisites:
 *   npm install node-appwrite
 */

const { Client, Databases, ID } = require('node-appwrite');

// ============ Configuration ============
// Set these OR use environment variables

const CONFIG = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '',      // ← SET THIS
    apiKey: process.env.APPWRITE_API_KEY || '',             // ← SET THIS (Server API key from Appwrite Console → Settings → API Keys)
    databaseId: process.env.APPWRITE_DATABASE_ID || 'omnistream',
};

if (!CONFIG.projectId || !CONFIG.apiKey) {
    console.error('\n❌ Missing configuration!\n');
    console.error('Set your Appwrite credentials:');
    console.error('  Option 1: Edit CONFIG in this file');
    console.error('  Option 2: Use environment variables:\n');
    console.error('    APPWRITE_PROJECT_ID=your_project_id \\');
    console.error('    APPWRITE_API_KEY=your_api_key \\');
    console.error('    node setup-database.js\n');
    console.error('To get an API key:');
    console.error('  → Appwrite Console → Settings → API Keys → Create API Key');
    console.error('  → Grant these scopes: databases.read, databases.write, collections.read, collections.write, attributes.read, attributes.write');
    process.exit(1);
}

// ============ Setup Client ============

const client = new Client();
client.setEndpoint(CONFIG.endpoint).setProject(CONFIG.projectId).setKey(CONFIG.apiKey);
const databases = new Databases(client);

// ============ Schema Definition ============

const COLLECTIONS = [
    {
        id: 'profiles',
        name: 'User Profiles',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'display_name', size: 256, required: false },
            { type: 'string', key: 'avatar_url', size: 2048, required: false },
            { type: 'string', key: 'role', size: 32, required: false, default: 'user' },
            { type: 'boolean', key: 'is_banned', required: false, default: false },
        ],
        indexes: [
            { key: 'idx_user_id', type: 'unique', attributes: ['user_id'] },
        ],
    },
    {
        id: 'favorites',
        name: 'Favorites',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'source_url', size: 2048, required: true },
            { type: 'string', key: 'file_name', size: 512, required: false },
            { type: 'string', key: 'file_size', size: 64, required: false },
            { type: 'string', key: 'file_type', size: 64, required: false },
            { type: 'string', key: 'thumbnail', size: 2048, required: false },
            { type: 'string', key: 'download_link', size: 4096, required: false },
            { type: 'string', key: 'fast_download_link', size: 4096, required: false },
            { type: 'string', key: 'stream_url', size: 4096, required: false },
            { type: 'string', key: 'fast_stream_url', size: 4096, required: false },
            { type: 'string', key: 'source', size: 32, required: false, default: 'terabox' },
            { type: 'integer', key: 'fs_id', required: false },
        ],
        indexes: [
            { key: 'idx_fav_user', type: 'key', attributes: ['user_id'] },
            { key: 'idx_fav_source', type: 'key', attributes: ['source_url'] },
        ],
    },
    {
        id: 'download_history',
        name: 'Download History',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'file_name', size: 512, required: false },
            { type: 'string', key: 'file_size', size: 64, required: false },
            { type: 'string', key: 'file_type', size: 64, required: false },
            { type: 'string', key: 'download_link', size: 4096, required: false },
            { type: 'string', key: 'source', size: 32, required: false, default: 'terabox' },
            { type: 'string', key: 'status', size: 32, required: false, default: 'initiated' },
        ],
        indexes: [
            { key: 'idx_dl_user', type: 'key', attributes: ['user_id'] },
        ],
    },
    {
        id: 'shared_links',
        name: 'Shared Links',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'share_code', size: 64, required: true },
            { type: 'string', key: 'source_url', size: 2048, required: true },
            { type: 'string', key: 'file_name', size: 512, required: false },
            { type: 'string', key: 'file_size', size: 64, required: false },
            { type: 'string', key: 'file_type', size: 64, required: false },
            { type: 'string', key: 'thumbnail', size: 2048, required: false },
            { type: 'integer', key: 'view_count', required: false },
            { type: 'integer', key: 'download_count', required: false },
            { type: 'string', key: 'file_data', size: 16384, required: false },
            { type: 'string', key: 'expires_at', size: 64, required: false },
        ],
        indexes: [
            { key: 'idx_share_code', type: 'unique', attributes: ['share_code'] },
            { key: 'idx_share_user', type: 'key', attributes: ['user_id'] },
        ],
    },
    {
        id: 'shared_cache',
        name: 'Shared Cache',
        attributes: [
            { type: 'string', key: 'source_url', size: 2048, required: true },
            { type: 'string', key: 'file_data', size: 65536, required: false },
            { type: 'integer', key: 'file_count', required: false },
            { type: 'string', key: 'cached_by', size: 128, required: false },
            { type: 'string', key: 'cached_at', size: 64, required: false },
        ],
        indexes: [
            { key: 'idx_cache_url', type: 'key', attributes: ['source_url'] },
        ],
    },
    {
        id: 'fetched_files',
        name: 'Fetched Files',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'source_url', size: 2048, required: true },
            { type: 'string', key: 'file_data', size: 65536, required: false },
            { type: 'integer', key: 'file_count', required: false },
        ],
        indexes: [
            { key: 'idx_fetch_user', type: 'key', attributes: ['user_id'] },
        ],
    },
    {
        id: 'user_roles',
        name: 'User Roles',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'role', size: 32, required: true },
        ],
        indexes: [
            { key: 'idx_role_user', type: 'key', attributes: ['user_id'] },
            { key: 'idx_role_combo', type: 'unique', attributes: ['user_id', 'role'] },
        ],
    },
    {
        id: 'link_health',
        name: 'Link Health',
        attributes: [
            { type: 'string', key: 'favorite_id', size: 128, required: true },
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'source_url', size: 2048, required: false },
            { type: 'string', key: 'status', size: 32, required: false, default: 'unknown' },
            { type: 'integer', key: 'fail_count', required: false },
            { type: 'string', key: 'last_checked_at', size: 64, required: false },
            { type: 'string', key: 'last_error', size: 512, required: false },
        ],
        indexes: [
            { key: 'idx_health_fav', type: 'unique', attributes: ['favorite_id'] },
            { key: 'idx_health_user', type: 'key', attributes: ['user_id'] },
        ],
    },
    {
        id: 'admin_logs',
        name: 'Admin Logs',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: false },
            { type: 'string', key: 'event_type', size: 64, required: true },
            { type: 'string', key: 'message', size: 2048, required: true },
            { type: 'string', key: 'metadata', size: 4096, required: false },
        ],
        indexes: [
            { key: 'idx_log_user', type: 'key', attributes: ['user_id'] },
            { key: 'idx_log_type', type: 'key', attributes: ['event_type'] },
        ],
    },
    {
        id: 'app_settings',
        name: 'App Settings',
        attributes: [
            { type: 'string', key: 'key', size: 128, required: true },
            { type: 'string', key: 'value', size: 4096, required: false },
            { type: 'string', key: 'description', size: 512, required: false },
        ],
        indexes: [
            { key: 'idx_setting_key', type: 'unique', attributes: ['key'] },
        ],
    },
    {
        id: 'rate_limits',
        name: 'Rate Limits',
        attributes: [
            { type: 'string', key: 'user_id', size: 128, required: true },
            { type: 'string', key: 'action_type', size: 64, required: true },
            { type: 'integer', key: 'count', required: false },
            { type: 'string', key: 'window_start', size: 64, required: false },
        ],
        indexes: [
            { key: 'idx_rl_user_action', type: 'unique', attributes: ['user_id', 'action_type'] },
        ],
    },
];

// ============ Helper: Wait for attribute to be ready ============

async function waitForAttribute(databaseId, collectionId, key, maxWait = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        try {
            const attr = await databases.getAttribute(databaseId, collectionId, key);
            if (attr.status === 'available') return true;
            if (attr.status === 'failed') return false;
        } catch { }
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

// ============ Main Setup ============

async function setup() {
    console.log('\n🚀 OmniStream Database Setup\n');
    console.log(`   Endpoint:    ${CONFIG.endpoint}`);
    console.log(`   Project ID:  ${CONFIG.projectId}`);
    console.log(`   Database ID: ${CONFIG.databaseId}\n`);

    // 1. Create Database
    console.log('📦 Creating database...');
    try {
        await databases.create(CONFIG.databaseId, 'OmniStream');
        console.log('   ✅ Database created\n');
    } catch (err) {
        if (err.code === 409) {
            console.log('   ⚡ Database already exists, continuing...\n');
        } else {
            console.error('   ❌ Failed:', err.message);
            process.exit(1);
        }
    }

    // 2. Create Collections + Attributes + Indexes
    for (const col of COLLECTIONS) {
        console.log(`📋 ${col.name} (${col.id})`);

        // Create collection
        try {
            await databases.createCollection(
                CONFIG.databaseId,
                col.id,
                col.name,
                undefined,           // permissions (inherit from database)
                false,                // documentSecurity
                true                  // enabled
            );
            console.log('   ✅ Collection created');
        } catch (err) {
            if (err.code === 409) {
                console.log('   ⚡ Already exists, checking attributes...');
            } else {
                console.error('   ❌ Failed:', err.message);
                continue;
            }
        }

        // Create attributes
        for (const attr of col.attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        CONFIG.databaseId, col.id, attr.key,
                        attr.size || 256,
                        attr.required || false,
                        attr.default || undefined,
                        attr.array || false
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        CONFIG.databaseId, col.id, attr.key,
                        attr.required || false,
                        undefined, undefined,
                        attr.default || undefined,
                        attr.array || false
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        CONFIG.databaseId, col.id, attr.key,
                        attr.required || false,
                        attr.default || undefined,
                        attr.array || false
                    );
                }
                console.log(`   ✅ ${attr.key} (${attr.type})`);
            } catch (err) {
                if (err.code === 409) {
                    console.log(`   ⚡ ${attr.key} already exists`);
                } else {
                    console.error(`   ❌ ${attr.key}: ${err.message}`);
                }
            }
        }

        // Wait for attributes to be available before creating indexes
        console.log('   ⏳ Waiting for attributes...');
        for (const attr of col.attributes) {
            await waitForAttribute(CONFIG.databaseId, col.id, attr.key);
        }

        // Create indexes
        if (col.indexes) {
            for (const idx of col.indexes) {
                try {
                    await databases.createIndex(
                        CONFIG.databaseId, col.id,
                        idx.key,
                        idx.type,
                        idx.attributes
                    );
                    console.log(`   ✅ Index: ${idx.key}`);
                } catch (err) {
                    if (err.code === 409) {
                        console.log(`   ⚡ Index ${idx.key} already exists`);
                    } else {
                        console.error(`   ❌ Index ${idx.key}: ${err.message}`);
                    }
                }
            }
        }

        console.log('');
    }

    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Set VITE_APPWRITE_PROJECT_ID in .env');
    console.log('  2. Deploy functions: cd appwrite && appwrite deploy function');
    console.log('  3. Set function environment variables in Appwrite Console');
    console.log('  4. Create a "thumbnails" storage bucket in Console\n');
}

setup().catch(err => {
    console.error('\n💥 Setup failed:', err);
    process.exit(1);
});
