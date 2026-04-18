import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('subscriptions')
export class PublicSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** 提交订阅 */
  @Post()
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscriptionService.subscribe(dto);
  }

  /** 确认订阅 */
  @Get('confirm/:token')
  confirm(@Param('token') token: string) {
    return this.subscriptionService.confirmSubscription(token);
  }

  /** 取消订阅 */
  @Get('unsubscribe/:token')
  unsubscribe(@Param('token') token: string) {
    return this.subscriptionService.unsubscribe(token);
  }
}
