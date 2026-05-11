-- DropForeignKey
ALTER TABLE "activity_media" DROP CONSTRAINT "activity_media_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "profile_images" DROP CONSTRAINT "profile_images_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "reservation_media" DROP CONSTRAINT "reservation_media_mediaId_fkey";

-- AddForeignKey
ALTER TABLE "activity_media" ADD CONSTRAINT "activity_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_media" ADD CONSTRAINT "reservation_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_images" ADD CONSTRAINT "profile_images_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
