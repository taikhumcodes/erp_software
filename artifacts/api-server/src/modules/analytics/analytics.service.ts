import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';

export interface PageVisitItem {
  id: string;
  createdAt: string;
  source: string;
  targetUrl: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  referrer: string | null;
}

export interface AnalyticsStats {
  total: number;
  today: number;
  sidebar: number;
  loginPage: number;
  uniqueIps: number;
}

export function parseUserAgent(ua?: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };

  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  let os = 'Unknown';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let device = 'Desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) device = 'Tablet';
  else if (/mobile|iphone|android|touch/i.test(ua)) device = 'Mobile';

  return { browser, os, device };
}

export const AnalyticsService = {
  async trackClick(params: {
    source: string;
    targetUrl?: string;
    userId?: string | null;
    userName?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    referrer?: string | null;
  }): Promise<void> {
    const id = 'clk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const source = (params.source || 'SIDEBAR').toUpperCase();
    const targetUrl = params.targetUrl || 'https://evolix-studio.in/contact';
    const { browser, os, device } = parseUserAgent(params.userAgent);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "page_visit_logs" (
        "id", "created_at", "source", "target_url",
        "user_id", "user_name", "user_email", "user_role",
        "ip_address", "user_agent", "browser", "os", "device", "referrer"
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      id,
      source,
      targetUrl,
      params.userId ?? null,
      params.userName ?? null,
      params.userEmail ?? null,
      params.userRole ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      browser,
      os,
      device,
      params.referrer ?? null
    );
  },

  async getPageVisits(filters: {
    page?: number;
    limit?: number;
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: PageVisitItem[];
    stats: AnalyticsStats;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    // Conditions
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (filters.source && filters.source !== 'ALL') {
      conditions.push(`"source" = $${idx++}`);
      values.push(filters.source.toUpperCase());
    }

    if (filters.startDate) {
      conditions.push(`"created_at" >= $${idx++}::timestamp`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`"created_at" <= $${idx++}::timestamp`);
      values.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(`(
        "ip_address" ILIKE $${idx} OR
        "user_name" ILIKE $${idx} OR
        "user_email" ILIKE $${idx} OR
        "browser" ILIKE $${idx} OR
        "os" ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Query Data
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "created_at" as "createdAt",
        "source",
        "target_url" as "targetUrl",
        "user_id" as "userId",
        "user_name" as "userName",
        "user_email" as "userEmail",
        "user_role" as "userRole",
        "ip_address" as "ipAddress",
        "user_agent" as "userAgent",
        "browser",
        "os",
        "device",
        "referrer"
      FROM "page_visit_logs"
      WHERE ${whereClause}
      ORDER BY "created_at" DESC
      LIMIT ${limit} OFFSET ${offset}`,
      ...values
    );

    // Total filtered count
    const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(
      `SELECT COUNT(*)::int as count FROM "page_visit_logs" WHERE ${whereClause}`,
      ...values
    );
    const total = Number(countRes[0]?.count ?? 0);

    // Global Stats
    const statsRes = await prisma.$queryRawUnsafe<
      [{
        total: number | string;
        today: number | string;
        sidebar: number | string;
        login_page: number | string;
        unique_ips: number | string;
      }]
    >(
      `SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN "created_at" >= CURRENT_DATE THEN 1 END)::int as today,
        COUNT(CASE WHEN "source" = 'SIDEBAR' THEN 1 END)::int as sidebar,
        COUNT(CASE WHEN "source" = 'LOGIN_PAGE' THEN 1 END)::int as login_page,
        COUNT(DISTINCT "ip_address")::int as unique_ips
      FROM "page_visit_logs"`
    );

    const s = statsRes[0] || {};
    const stats: AnalyticsStats = {
      total: Number(s.total ?? 0),
      today: Number(s.today ?? 0),
      sidebar: Number(s.sidebar ?? 0),
      loginPage: Number(s.login_page ?? 0),
      uniqueIps: Number(s.unique_ips ?? 0),
    };

    const data: PageVisitItem[] = rows.map((r) => ({
      id: String(r.id),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      source: String(r.source),
      targetUrl: String(r.targetUrl),
      userId: r.userId ? String(r.userId) : null,
      userName: r.userName ? String(r.userName) : null,
      userEmail: r.userEmail ? String(r.userEmail) : null,
      userRole: r.userRole ? String(r.userRole) : null,
      ipAddress: r.ipAddress ? String(r.ipAddress) : null,
      userAgent: r.userAgent ? String(r.userAgent) : null,
      browser: r.browser ? String(r.browser) : null,
      os: r.os ? String(r.os) : null,
      device: r.device ? String(r.device) : null,
      referrer: r.referrer ? String(r.referrer) : null,
    }));

    return {
      data,
      stats,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async exportCsv(filters: {
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (filters.source && filters.source !== 'ALL') {
      conditions.push(`"source" = $${idx++}`);
      values.push(filters.source.toUpperCase());
    }

    if (filters.startDate) {
      conditions.push(`"created_at" >= $${idx++}::timestamp`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`"created_at" <= $${idx++}::timestamp`);
      values.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(`(
        "ip_address" ILIKE $${idx} OR
        "user_name" ILIKE $${idx} OR
        "user_email" ILIKE $${idx} OR
        "browser" ILIKE $${idx} OR
        "os" ILIKE $${idx}
      )`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "created_at" as "createdAt",
        "source",
        "target_url" as "targetUrl",
        "user_name" as "userName",
        "user_email" as "userEmail",
        "user_role" as "userRole",
        "ip_address" as "ipAddress",
        "browser",
        "os",
        "device",
        "referrer"
      FROM "page_visit_logs"
      WHERE ${whereClause}
      ORDER BY "created_at" DESC
      LIMIT 10000`,
      ...values
    );

    const headers = [
      'ID',
      'Date Time (UTC)',
      'Source',
      'User Name',
      'User Email',
      'User Role',
      'IP Address',
      'Browser',
      'OS',
      'Device',
      'Target URL',
      'Referrer',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const dateStr = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
      csvLines.push([
        escapeCsv(r.id),
        escapeCsv(dateStr),
        escapeCsv(r.source),
        escapeCsv(r.userName || 'Guest'),
        escapeCsv(r.userEmail || '-'),
        escapeCsv(r.userRole || '-'),
        escapeCsv(r.ipAddress || '-'),
        escapeCsv(r.browser || '-'),
        escapeCsv(r.os || '-'),
        escapeCsv(r.device || '-'),
        escapeCsv(r.targetUrl || '-'),
        escapeCsv(r.referrer || '-'),
      ].join(','));
    }

    return csvLines.join('\r\n');
  },
};
