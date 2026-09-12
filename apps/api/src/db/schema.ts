import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  budgetCents: integer('budget_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
