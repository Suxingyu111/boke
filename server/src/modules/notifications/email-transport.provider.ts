import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const EMAIL_TRANSPORT = 'EMAIL_TRANSPORT';

const logger = new Logger('EmailTransportProvider');

export const EmailTransportProvider: Provider = {
  provide: EMAIL_TRANSPORT,
  useFactory: (configService: ConfigService): nodemailer.Transporter | null => {
    const host = configService.get<string>('email.host');
    const port = configService.get<number>('email.port', 587);
    const user = configService.get<string>('email.user');
    const pass = configService.get<string>('email.pass');

    if (!host || !user || !pass) {
      logger.warn('邮件配置不完整(SMTP_HOST/SMTP_USER/SMTP_PASS)，邮件功能将不可用');
      return null;
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    transport.verify().then(
      () => logger.log('SMTP 邮件服务连接成功'),
      (err: Error) => logger.warn(`SMTP 连接失败: ${err.message}`),
    );

    return transport;
  },
  inject: [ConfigService],
};
