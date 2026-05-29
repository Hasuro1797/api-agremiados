import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MailModule } from 'src/mail/mail.module';
import { SettingsModule } from 'src/settings/settings.module';
import { XmlBuilderService } from './xml-builder/xml-builder.service';
import { SignatureService } from './signature/signature.service';
import { SunatSenderService } from './sunat-sender/sunat-sender.service';
import { SunatEmissionService } from './sunat-emission.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { SunatResolver } from './sunat.resolver';
import { RetrySunatTask } from './tasks/retry-sunat.task';

@Module({
  imports: [HttpModule, CloudinaryModule, SettingsModule, MailModule],
  providers: [
    XmlBuilderService,
    SignatureService,
    SunatSenderService,
    SunatEmissionService,
    InvoicePdfService,
    SunatResolver,
    RetrySunatTask,
  ],
  exports: [
    XmlBuilderService,
    SignatureService,
    SunatSenderService,
    SunatEmissionService,
  ],
})
export class SunatModule {}
