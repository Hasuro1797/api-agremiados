import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CertificatesService } from './certificates.service';
import { CertificatesResolver } from './certificates.resolver';

@Module({
  imports: [CloudinaryModule],
  providers: [CertificatesService, CertificatesResolver],
  exports: [CertificatesService],
})
export class CertificatesModule {}
