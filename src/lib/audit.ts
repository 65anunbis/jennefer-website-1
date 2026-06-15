import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AuditAction, AuditResourceType } from "@/generated/prisma/enums";

/**
 * Append a row to the audit log (plan §10). Append-only: callers pass a summary
 * of *which* fields changed, never the values. Actor identity and IP are
 * resolved from the current session/request so call sites stay terse.
 */
export async function recordAudit(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: number | null,
  summary: string,
) {
  const session = await getServerSession(authOptions);
  const h = headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  await prisma.auditLog.create({
    data: {
      actorId: session?.user?.id ? Number(session.user.id) : null,
      actorUsername: session?.user?.username ?? "system",
      action,
      resourceType,
      resourceId,
      summary,
      ipAddress: ip,
    },
  });
}
