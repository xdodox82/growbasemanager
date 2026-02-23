import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://yyigfdevvikroeenqott.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWdmZGV2dmlrcm9lZW5xb3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDkxODgsImV4cCI6MjA4MzAyNTE4OH0.puhHa9i7yAaO4Kw7Ez05otcnM8g2kpcR0fpr41DoTuo';

const NEW_URL = 'https://fqzxqyzqiddtqysxkdye.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxenhxeXpxaWRkdHF5c3hrZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4Njg5OTgsImV4cCI6MjA4MjQ0NDk5OH0.K-RRpvw1U9QJ6I-lBdcq3wzbaNckmC0mKgyrvewF4sw';

const EMAIL = 'mikrorastlinky@gmail.com';
const PASSWORD = 'Admindodo1982';

const oldSupabase = createClient(OLD_URL, OLD_ANON_KEY);
const newSupabase = createClient(NEW_URL, NEW_ANON_KEY);

const tables = [
  'users',
  'delivery_days',
  'delivery_routes',
  'crops',
  'customers',
  'suppliers',
  'blends',
  'seeds',
  'substrate',
  'labels',
  'packaging',
  'other_inventory',
  'orders',
  'prices',
  'plantings',
  'harvests',
  'deliveries',
  'seed_consumption',
  'blend_consumption',
  'substrate_consumption',
  'label_consumption',
  'packaging_consumption',
  'other_inventory_consumption'
];

async function migrateData() {
  console.log('🔐 Prihlasujem sa do starej databázy...');

  const { data: authData, error: authError } = await oldSupabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError) {
    console.error('❌ Chyba prihlásenia:', authError.message);
    return;
  }

  console.log('✅ Prihlásený ako:', authData.user.email);
  console.log('\n📦 Začínam migráciu dát...\n');

  for (const table of tables) {
    try {
      console.log(`📋 Spracovávam tabuľku: ${table}`);

      const { data, error } = await oldSupabase
        .from(table)
        .select('*');

      if (error) {
        console.log(`⚠️  Tabuľka ${table} neexistuje alebo je prázdna:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`ℹ️  Tabuľka ${table} je prázdna`);
        continue;
      }

      console.log(`   Nájdených ${data.length} záznamov`);

      for (const record of data) {
        const { error: insertError } = await newSupabase
          .from(table)
          .upsert(record, { onConflict: 'id' });

        if (insertError) {
          console.error(`   ❌ Chyba pri vkladaní do ${table}:`, insertError.message);
        }
      }

      console.log(`✅ Tabuľka ${table} migrovaná (${data.length} záznamov)\n`);

    } catch (err) {
      console.error(`❌ Neočakávaná chyba pri ${table}:`, err.message);
    }
  }

  console.log('\n🎉 Migrácia dokončená!');
}

migrateData().catch(console.error);
