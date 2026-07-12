import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

async function main() {
  const email = 'owner@stocklot.local'
  const passwordHash = await hashPassword('changeme123')
  await db.appUser.upsert({
    where: { email },
    update: {},
    create: { name: 'Owner', email, role: 'OWNER', passwordHash },
  })
  console.log(`Seeded owner user → ${email} / changeme123 (change this after first login)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
