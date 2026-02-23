Deno.serve(() => {
  return new Response(
    JSON.stringify({ status: "pong", timestamp: Date.now() }),
    { 
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
      } 
    }
  );
});