import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { ServerModule } from './server/server.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, ServerModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
