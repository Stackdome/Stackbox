import { Global, Module } from '@nestjs/common'
import { createDb } from './client'

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION'

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: () => createDb(process.env.DATABASE_URL),
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DbModule {}
