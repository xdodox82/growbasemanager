import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://yyigfdevvikroeenqott.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWdmZGV2dmlrcm9lZW5xb3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDkxODgsImV4cCI6MjA4MzAyNTE4OH0.puhHa9i7yAaO4Kw7Ez05otcnM8g2kpcR0fpr41DoTuo';
const EMAIL = 'mikrorastlinky@gmail.com';
const PASSWORD = 'Admindodo1982';

const oldSupabase = createClient(OLD_URL, OLD_ANON_KEY);

const tables = [
  'customers',
  'crops',
  'suppliers',
  'blends',
  'seeds',
  'labels',
  'other_inventory',
  'orders',
  'prices'
];

async function checkData() {
  console.log('🔐 Prihlasujem sa...');

  const { error: authError } = await oldSupabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError) {
    console.error('❌ Chyba prihlásenia:', authError.message);
    return;
  }

  console.log('📊 Kontrolujem dáta v STAREJ databáze (yyigfdevvikroeenqott)...\n');

  for (const table of tables) {
    try {
      const { data, error } = await oldSupabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data.length} záznamov`);
        if (data.length > 0) {
          console.log('   Prvý záznam:', JSON.stringify(data[0], null, 2));
        }
      }
    } catch (err) {
      console.error(`❌ ${table}: ${err.message}`);
    }
  }
}

checkData().catch(console.error);
