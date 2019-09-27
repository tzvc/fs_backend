import { Module } from '@nestjs/common';
import { ServerGateway } from './server.gateway';
import { UsersModule } from '../users/users.module';
import { ServerService } from './server.service';

@Module({
  imports: [UsersModule],
  providers: [ServerGateway, ServerService],
  exports: [],
})
export class ServerModule {}
