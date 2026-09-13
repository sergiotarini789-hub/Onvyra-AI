import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { generateDemoLeads } from "../src/lib/demo/data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  const email = "demo@onvyra.ai";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists");
    return;
  }

  const passwordHash = await hashPassword("demo12345");
  const user = await prisma.user.create({
    data: { email, passwordHash, name: "Demo User" },
  });

  const org = await prisma.organization.create({
    data: { name: "Demo Organization", slug: "demo-org-" + Math.random().toString(36).slice(2, 6) },
  });

  await prisma.organizationMember.create({
    data: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });

  console.log("Created demo org", org.id);

  // Generate leads without AI for seed speed
  const demoLeads = generateDemoLeads(100);
  for (const dl of demoLeads) {
    await prisma.lead.create({
      data: {
        organizationId: org.id,
        name: dl.name,
        phone: dl.phone,
        email: dl.email,
        company: dl.company,
        product: dl.product,
        dealValue: dl.dealValue,
        dealStage: dl.dealStage,
        status: dl.status,
        lastContactAt: dl.lastContactAt,
        lastMessage: dl.lastMessage,
        source: dl.source,
        manager: dl.manager,
        rawData: JSON.stringify(dl),
        isDemo: true,
      },
    });
  }

  console.log("Seeded", demoLeads.length, "demo leads");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
