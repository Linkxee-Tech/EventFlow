import { NextRequest } from 'next/server';
import { listRecentOrdersByOrganizer } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const orders = await listRecentOrdersByOrganizer(auth.userId, 10);
    const sales = orders.map((o) => ({
      orderId: o.orderId,
      buyerName: o.buyerName,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
    }));
    return apiSuccess(sales);
  } catch (err) {
    logError('GET /api/notifications/sales', err);
    return apiError('Failed to load notifications', 500);
  }
}
