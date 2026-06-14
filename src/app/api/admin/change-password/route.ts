import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req
    .json()
    .catch(() => ({}) as { currentPassword?: string; newPassword?: string });

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
