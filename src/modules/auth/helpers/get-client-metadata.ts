/**
 * Client Metadata Helper
 * ======================
 *
 * Extracts client IP and User-Agent in a proxy-aware manner for audit logging.
 */

export function getClientMetadata(headers: Record<string, any>, fallbackIp: string | undefined): { ip: string | null; userAgent: string | null } {
  const xff = headers['x-forwarded-for'] as string | undefined;
  const ip = xff?.split(',')[0]?.trim() || fallbackIp || null;
  const userAgent = (headers['user-agent'] as string | undefined) || null;
  return { ip, userAgent };
}
