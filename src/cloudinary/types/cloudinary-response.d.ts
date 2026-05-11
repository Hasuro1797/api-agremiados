export { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

export type CloudinaryResponse = UploadApiErrorResponse | UploadApiResponse;

export type CloudinaryOptionsDestroy = {
  resource_type?: ResourceType;
  type?: DeliveryType;
  invalidate?: boolean;
};
