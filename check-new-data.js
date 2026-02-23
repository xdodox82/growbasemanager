import { createClient } from '@supabase/supabase-js';

const NEW_URL = 'https://fqzxqyzqiddtqysxkdye.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxenhxeXpxaWRkdHF5c3hrZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4Njg5OTgsImV4cCI6MjA4MjQ0NDk5OH0.K-RRpvw1U9QJ6I-lBdcq3wzbaNckmC0mKgyrvewF4sw';

const newSupabase = createClient(NEW_URL, NEW_ANON_KEY);

const tables = [
  'customers',
  'crops',
  'suppliers',
  'blends',
  'seeds',
  'substrate',
  'labels',
  'packaging',
  'other_inventory',
  'plantings',
  'harvests',
  'orders',
  'deliveries',
  'prices'
];

async function checkData() {
  console.log('📊 Kontrolujem dáta v novej databáze...\n');

  for (const table of tables) {
    try {
      const { data, error } = await newSupabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data.length} záznamov`);
      }
    } catch (err) {
      console.error(`❌ ${table}: ${err.message}`);
    }
  }
}

checkData().catch(console.error);
