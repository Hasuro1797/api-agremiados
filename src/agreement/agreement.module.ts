import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AgreementResolver } from './agreement.resolver';
import { AgreementService } from './agreement.service';

@Module({
  imports: [CloudinaryModule],
  providers: [AgreementResolver, AgreementService],
})
export class AgreementModule {}
