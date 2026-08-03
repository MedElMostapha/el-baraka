import { applyOperation } from '@/lib/server/syncHandlers';
import { MAX_OPERATIONS_PER_REQUEST, type SyncRequest, type SyncResponse, type SyncResult } from '@/lib/offline/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: SyncRequest;
  try {
    body = (await request.json()) as SyncRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { deviceId, operations } = body ?? {};
  if (typeof deviceId !== 'string' || deviceId.length === 0) {
    return Response.json({ error: 'Missing deviceId' }, { status: 400 });
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    return Response.json({ error: 'Missing operations' }, { status: 400 });
  }
  if (operations.length > MAX_OPERATIONS_PER_REQUEST) {
    return Response.json({ error: `Too many operations (max ${MAX_OPERATIONS_PER_REQUEST})` }, { status: 400 });
  }

  for (const op of operations) {
    if (!op || typeof op.operationId !== 'string' || typeof op.type !== 'string' || typeof op.entityId !== 'string') {
      return Response.json({ error: 'Malformed operation' }, { status: 400 });
    }
  }

  const results: SyncResult[] = [];
  for (const op of operations) {
    results.push(await applyOperation(deviceId, op));
  }

  const response: SyncResponse = {
    serverTime: new Date().toISOString(),
    results,
  };
  return Response.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
