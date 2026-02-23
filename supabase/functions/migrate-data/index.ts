import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let { table, data, userId } = await req.json();

    if (!table || !data) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: table or data"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the first user's ID if userId not provided
    if (!userId) {
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (!userError && users && users.users.length > 0) {
        userId = users.users[0].id;
        console.log(`Using first user ID: ${userId}`);
      }
    }

    const tableNameMap: Record<string, string> = {
      'packagings': 'packaging',
      'substrates': 'substrate',
      'planting_plans': 'planting_plan',
    };

    const originalTable = table;
    if (tableNameMap[table]) {
      table = tableNameMap[table];
      console.log(`Mapping table name: ${originalTable} -> ${table}`);
    }

    const cleanedData = data.map((item: any) => {
      const cleaned = { ...item };

      if (cleaned.createdAt) {
        cleaned.created_at = cleaned.createdAt;
        delete cleaned.createdAt;
      }
      if (cleaned.updatedAt) {
        cleaned.updated_at = cleaned.updatedAt;
        delete cleaned.updatedAt;
      }

      // Set user_id for all records
      if (userId) {
        cleaned.user_id = userId;
      }

      return cleaned;
    });

    console.log(`Migrating ${cleanedData.length} records to ${table} with user_id: ${userId}`);

    try {
      await supabaseAdmin.rpc('set_session_replica').catch(() => {
        console.log('Could not set replica mode, continuing anyway...');
      });
    } catch (e) {
      console.log('RPC not available, using direct insert');
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < cleanedData.length; i++) {
      const record = cleanedData[i];

      try {
        const { error } = await supabaseAdmin
          .from(table)
          .upsert(record, {
            onConflict: "id",
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`Error inserting record ${i + 1}/${cleanedData.length}:`, error);
          failedCount++;
          errors.push({
            recordIndex: i,
            recordId: record.id,
            error: error.message,
            code: error.code,
            hint: error.hint
          });
        } else {
          successCount++;
        }
      } catch (recordError: any) {
        console.error(`Exception inserting record ${i + 1}/${cleanedData.length}:`, recordError);
        failedCount++;
        errors.push({
          recordIndex: i,
          recordId: record.id,
          error: recordError.message
        });
      }
    }

    try {
      await supabaseAdmin.rpc('set_session_default').catch(() => {});
    } catch (e) {}

    if (failedCount > 0) {
      console.error(`Migration completed with errors: ${successCount} success, ${failedCount} failed`);
      return new Response(
        JSON.stringify({
          error: `${failedCount} records failed to insert`,
          successCount,
          failedCount,
          errors: errors.slice(0, 5),
          hint: errors.length > 5 ? "Showing first 5 errors only" : undefined,
          code: errors[0]?.code
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: successCount,
        table: table
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});