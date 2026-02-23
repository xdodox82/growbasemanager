import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginTrackRequest {
  user_id: string;
  user_agent: string;
}

// Parse user agent to get device info
function parseUserAgent(userAgent: string): { deviceType: string; browser: string; os: string } {
  let deviceType = 'desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device type
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Detect browser
  if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/edg/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera';
  }

  // Detect OS
  if (/windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
  }

  return { deviceType, browser, os };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { user_id, user_agent }: LoginTrackRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse user agent
    const { deviceType, browser, os } = parseUserAgent(user_agent || '');

    // Get client IP from headers
    const ip_address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       req.headers.get("cf-connecting-ip") || 
                       "Unknown";

    // Check if this is a new device by comparing with recent logins
    const { data: recentLogins } = await supabase
      .from("login_history")
      .select("user_agent, browser, os")
      .eq("user_id", user_id)
      .order("login_at", { ascending: false })
      .limit(10);

    const isNewDevice = !recentLogins?.some(
      (login: any) => login.browser === browser && login.os === os
    );

    // Insert login record
    const { error } = await supabase
      .from("login_history")
      .insert({
        user_id,
        ip_address,
        user_agent,
        device_type: deviceType,
        browser,
        os,
        is_new_device: isNewDevice,
      });

    if (error) {
      console.error("Error inserting login history:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Login tracked for user ${user_id} from ${browser}/${os} (new device: ${isNewDevice})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        is_new_device: isNewDevice,
        device_info: { deviceType, browser, os }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in track-login function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
