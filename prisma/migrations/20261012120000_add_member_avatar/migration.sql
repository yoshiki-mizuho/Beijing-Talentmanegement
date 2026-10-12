ALTER TABLE "Member" ADD COLUMN "avatarImage" BYTEA;
ALTER TABLE "Member" ADD COLUMN "avatarMimeType" TEXT;
ALTER TABLE "Member" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);
