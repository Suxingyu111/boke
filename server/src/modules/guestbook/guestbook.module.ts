import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guestbook } from '@database/entities';
import { PublicGuestbookController } from './public-guestbook.controller';
import { AdminGuestbookController } from './admin-guestbook.controller';
import { GuestbookService } from './guestbook.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guestbook])],
  controllers: [PublicGuestbookController, AdminGuestbookController],
  providers: [GuestbookService],
  exports: [GuestbookService],
})
export class GuestbookModule {}
