import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { PostResolver } from './post.resolver';
import { PostService } from './post.service';

@Module({
  imports: [CloudinaryModule],
  providers: [PostResolver, PostService],
})
export class PostModule {}
