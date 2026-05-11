import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  providers: [MediaResolver, MediaService],
  imports: [CloudinaryModule],
})
export class MediaModule {}
