import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { authConfig } from '@/auth.config'
import type { Role } from '@/lib/enums'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const email = String(c?.email ?? '').trim().toLowerCase()
        const password = String(c?.password ?? '')
        if (!email || !password) return null
        const user = await db.appUser.findUnique({ where: { email } })
        if (!user || !user.active) return null
        if (!(await verifyPassword(password, user.passwordHash))) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role as Role }
      },
    }),
  ],
})
