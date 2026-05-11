import { GatewayTimeoutException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import { EnvConfig } from 'src/config';
import {
  CloudinaryOptionsDestroy,
  CloudinaryResponse,
} from './types/cloudinary-response';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService<EnvConfig>) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: config.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: config.get('CLOUDINARY_API_SECRET', { infer: true }),
    });
  }

  async upload(
    stream: NodeJS.ReadableStream,
    options?: UploadApiOptions,
  ): Promise<CloudinaryResponse> {
    try {
      const uploadData = await new Promise<CloudinaryResponse>(
        (resolve, reject) => {
          const upload = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
              if (error) {
                return reject(error);
              }
              resolve(result);
            },
          );
          stream.pipe(upload);
        },
      );
      return uploadData;
    } catch (error) {
      throw new GatewayTimeoutException(error);
    }
  }
  buildDownloadUrl(publicId: string, format: string, fileName: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      ...(format && { format }),
      flags: `attachment:${fileName}`,
    });
  }

  async delete(publicId: string, options?: CloudinaryOptionsDestroy) {
    try {
      const response = await cloudinary.uploader.destroy(publicId, options);
      return response;
    } catch (error) {
      throw new GatewayTimeoutException(error);
    }
  }
}
