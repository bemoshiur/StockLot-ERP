import { db } from '@/lib/db'

/** Returns an error message if the given "YYYY-MM" period is closed, else null.
 *  Transactional server actions call this to block edits to closed months. */
export async function periodLockError(month: string): Promise<string | null> {
  const p = await db.period.findUnique({ where: { month } })
  if (p?.status === 'CLOSED') return `Period ${month} is closed. Reopen it to make changes.`
  return null
}
