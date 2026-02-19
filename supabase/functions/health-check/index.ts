import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

Deno.serve(async () => {
  const startedAt = Date.now();
  const { error } = await supabase.from('profiles').select('id').limit(1);

  if (error) {
    return new Response(
      JSON.stringify({ status: 'degraded', latency_ms: Date.now() - startedAt, error: String(error) }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ status: 'ok', latency_ms: Date.now() - startedAt, ts: new Date().toISOString() }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
});
