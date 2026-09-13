import { hashPassword } from '../src/auth/password'
import { createDb } from '../src/db/client'
import { FIXTURE, seed } from '../src/db/seed'

const db = createDb(process.env.DATABASE_URL)
await seed(db, { passwordHash: await hashPassword(FIXTURE.password), now: new Date() })
await db.$client.end()
