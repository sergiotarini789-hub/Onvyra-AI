import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, password, name, organizationName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const slug = slugify(organizationName);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      },
    });

    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      role: "OWNER",
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true, organizationId: org.id });
  } catch (e: any) {
    console.error("register error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
