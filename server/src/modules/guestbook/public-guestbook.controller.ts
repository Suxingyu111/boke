import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CreateGuestbookDto } from './dto/create-guestbook.dto';
import { GuestbookService } from './guestbook.service';

@Controller('guestbook')
export class PublicGuestbookController {
  constructor(private readonly guestbookService: GuestbookService) {}

  /** 获取已审核的留言列表 */
  @Get()
  getMessages(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.guestbookService.getApprovedMessages(page, pageSize);
  }

  /** 提交留言 */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createMessage(@Body() dto: CreateGuestbookDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    return this.guestbookService.createMessage(dto, ip);
  }
}
