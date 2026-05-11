import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';

@Injectable()
export class MailService {
  constructor(private readonly mailService: MailerService) {}

  async sendMail(mailObject: CreateEmailDto): Promise<{ message: string }> {
    const { from, ...rest } = mailObject;
    let emailOptions: CreateEmailDto;

    if (!from) emailOptions = { ...rest };
    else emailOptions = mailObject;
    await this.mailService.sendMail(emailOptions);
    return {
      message: 'Email sent successfully',
    };
  }
}
