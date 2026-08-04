import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Public }          from '../common/decorators/roles.decorator';

@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  @Public()
  @Post('wompi')
  wompi(@Body() body: any, @Headers('x-wompi-signature') sig: string) {
    return this.svc.handleWompi(body, sig);
  }
}
