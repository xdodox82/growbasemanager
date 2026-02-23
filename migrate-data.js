import { createClient } from '@supabase/supabase-js';

const OLD_DB_URL = 'https://fqzxqyzqiddtqysxkdye.supabase.co';
const OLD_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxenhxeXpxaWRkdHF5c3hrZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4Njg5OTgsImV4cCI6MjA4MjQ0NDk5OH0.K-RRpvw1U9QJ6I-lBdcq3wzbaNckmC0mKgyrvewF4sw';

const NEW_DB_URL = 'https://yyigfdevvikroeenqott.supabase.co';
const NEW_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWdmZGV2dmlrcm9lZW5xb3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDkxODgsImV4cCI6MjA4MzAyNTE4OH0.puhHa9i7yAaO4Kw7Ez05otcnM8g2kpcR0fpr41DoTuo';

const oldSupabase = createClient(OLD_DB_URL, OLD_DB_KEY);
const newSupabase = createClient(NEW_DB_URL, NEW_DB_KEY);

const tables = [
  'delivery_days',
  'delivery_routes',
  'crops',
  'customers',
  'suppliers',
  'blends',
  'seeds',
  'substrates',
  'packagings',
  'labels',
  'other_inventory',
  'orders',
  'prices',
  'order_items',
  'planting_plans',
  'tasks',
  'vat_settings',
];

async function migrateTable(tableName, userId) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  const { data: oldData, error: fetchError } = await oldSupabase
    .from(tableName)
    .select('*');

  if (fetchError) {
    console.error(`❌ Error fetching from ${tableName}:`, fetchError.message);
    return { success: false, error: fetchError };
  }

  if (!oldData || oldData.length === 0) {
    console.log(`⚠️  No data in ${tableName}`);
    return { success: true, count: 0 };
  }

  console.log(`   Found ${oldData.length} records`);

  const dataWithUserId = oldData.map(record => ({
    ...record,
    user_id: userId
  }));

  const { data: newData, error: insertError } = await newSupabase
    .from(tableName)
    .upsert(dataWithUserId, { onConflict: 'id' })
    .select();

  if (insertError) {
    console.error(`❌ Error inserting into ${tableName}:`, insertError.message);
    return { success: false, error: insertError };
  }

  console.log(`✅ Successfully migrated ${oldData.length} records to ${tableName}`);
  return { success: true, count: oldData.length };
}

async function migrate() {
  console.log('🚀 Starting data migration from Loveable to Bolt...\n');
  console.log(`📍 Old DB: ${OLD_DB_URL}`);
  console.log(`📍 New DB: ${NEW_DB_URL}\n`);

  console.log('🔐 Getting user ID from new database...');

  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  if (!USER_EMAIL || !USER_PASSWORD) {
    console.error('❌ USER_EMAIL and USER_PASSWORD environment variables are required');
    console.error('   Example: USER_EMAIL=your@email.com USER_PASSWORD=yourpassword node migrate-data.js');
    process.exit(1);
  }

  const { data: authData, error: authError } = await newSupabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  if (authError || !authData.user) {
    console.error('❌ Failed to authenticate:', authError?.message);
    console.error('   Please check your USER_EMAIL and USER_PASSWORD');
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Authenticated as: ${authData.user.email}`);
  console.log(`   User ID: ${userId}\n`);

  const results = {
    successful: [],
    failed: [],
    empty: [],
    totalRecords: 0
  };

  for (const table of tables) {
    const result = await migrateTable(table, userId);

    if (result.success) {
      if (result.count > 0) {
        results.successful.push({ table, count: result.count });
        results.totalRecords += result.count;
      } else {
        results.empty.push(table);
      }
    } else {
      results.failed.push({ table, error: result.error });
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('📊 MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════\n');

  console.log(`✅ Successfully migrated: ${results.successful.length} tables`);
  results.successful.forEach(({ table, count }) => {
    console.log(`   - ${table}: ${count} records`);
  });

  if (results.empty.length > 0) {
    console.log(`\n⚠️  Empty tables (skipped): ${results.empty.length}`);
    results.empty.forEach(table => {
      console.log(`   - ${table}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed tables: ${results.failed.length}`);
    results.failed.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error.message}`);
    });
  }

  console.log(`\n📈 Total records migrated: ${results.totalRecords}`);
  console.log('\n═══════════════════════════════════════\n');

  if (results.failed.length === 0) {
    console.log('🎉 Migration completed successfully!');
  } else {
    console.log('⚠️  Migration completed with errors. See details above.');
  }
}

migrate().catch(console.error);
