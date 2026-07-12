import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

/** Create a record only if one with the same natural key does not already exist (idempotent). */
async function ensure<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  return (await find()) ?? (await create())
}

async function main() {
  // 1. Owner login
  const ownerEmail = 'owner@stocklot.local'
  await db.appUser.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { name: 'Owner', email: ownerEmail, role: 'OWNER', passwordHash: await hashPassword('changeme123') },
  })

  // 2. Locations (delivery areas seen in June'26)
  const areas = [
    ['Uttara', 'Sonia Market'],
    ['Mirpur', null],
    ['Mouchak', null],
    ['Malibagh', null],
    ['DEPZ', 'Sonia Market'],
    ['Salna', null],
  ] as const
  const locations: Record<string, string> = {}
  for (const [areaName, marketOrShop] of areas) {
    const loc = await ensure(
      () => db.location.findFirst({ where: { areaName } }),
      () => db.location.create({ data: { areaName, marketOrShop } }),
    )
    locations[areaName] = loc.id
  }

  // 3. Supplier
  await ensure(
    () => db.supplier.findFirst({ where: { name: 'StockLot Supplier' } }),
    () => db.supplier.create({ data: { name: 'StockLot Supplier', notes: 'Bulk surplus lots (challan 25589+)' } }),
  )

  // 4. Customers (deduped wholesale buyers from the Home sheet)
  const customers: [string, string | null][] = [
    ['Raju Bhai', 'Uttara'],
    ['Shafique Bhai', 'Uttara'],
    ['Pintu Bhai', 'Mouchak'],
    ['Mostaque Bhai', 'Uttara'],
    ['Khokon', 'Mouchak'],
    ['Hanif Bhai', 'Mirpur'],
    ['Belal Hossain', 'DEPZ'],
    ['Manik Bhai', 'Uttara'],
  ]
  for (const [name, area] of customers) {
    await ensure(
      () => db.customer.findFirst({ where: { name } }),
      () => db.customer.create({ data: { name, defaultLocationId: area ? locations[area] : null } }),
    )
  }

  // 5. Styles with per-style standard cost (owner should refine these).
  const styles: {
    styleCode: string
    styleName: string
    genderAgeGroup?: string
    category?: string
    standardCost: number
    isBulkLot?: boolean
  }[] = [
    { styleCode: 'TS-MENS', styleName: 'Mens T-Shirt', genderAgeGroup: 'Mens', category: 'T-Shirt', standardCost: 52 },
    { styleCode: 'TS-LADIES', styleName: 'Ladies T-Shirt', genderAgeGroup: 'Ladies', category: 'T-Shirt', standardCost: 40 },
    { styleCode: 'HOOD-MENS', styleName: 'Mens Hoodie', genderAgeGroup: 'Mens', category: 'Hoodie', standardCost: 90 },
    { styleCode: 'KEEPER', styleName: 'Keeper', category: 'Keeper', standardCost: 38 },
    { styleCode: 'BOXER', styleName: 'Boxer', category: 'Boxer', standardCost: 18 },
    { styleCode: 'PLAZO', styleName: 'Plazo', genderAgeGroup: 'Ladies', category: 'Plazo', standardCost: 45 },
    { styleCode: 'JACAMO', styleName: 'Mens T-Shirt Jacamo', genderAgeGroup: 'Mens', category: 'T-Shirt', standardCost: 55 },
    { styleCode: 'PRE-STOCK', styleName: 'Pre Stock Mixed Item', category: 'Mixed', standardCost: 40, isBulkLot: true },
  ]
  for (const s of styles) {
    await db.productStyle.upsert({ where: { styleCode: s.styleCode }, update: {}, create: s })
  }

  console.log(
    `Seeded: owner (${ownerEmail} / changeme123), ${areas.length} locations, 1 supplier, ${customers.length} customers, ${styles.length} styles.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
