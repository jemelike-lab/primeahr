import { createClient } from '@supabase/supabase-js';
import { verifyCronAuth } from '@/lib/bridge/signature';
import { processInbox } from '@/lib/bridge/inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET ?? null;

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!verifyCronAuth(req, CRON_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const t0 = Date.now();
  try {
    const result = await processInbox(admin);
    return json({ ok: true, duration_ms: Date.now() - t0, ...result }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, duration_ms: Date.now() - t0, error: msg }, 500);
  }
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json' },
  });
}
