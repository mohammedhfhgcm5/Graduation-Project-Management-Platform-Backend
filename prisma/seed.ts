import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@grad.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const adminName = process.env.ADMIN_NAME ?? 'Department Head';
  const adminDepartment = process.env.ADMIN_DEPARTMENT ?? 'Computer Science';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (existingAdmin) {
    const admin = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: adminName,
        role: Role.HEAD,
        department: adminDepartment,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(
      `[seed] Admin already exists. Updated role/profile for ${admin.email} (${admin.role}).`,
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: Role.HEAD,
      department: adminDepartment,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log(
    `[seed] Admin created: ${admin.email} (${admin.role}).`,
  );
}

async function main() {
  await seedAdmin();
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed to seed admin user:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
