-- Hub の入口が身元を管理するため、自前の認証データを削除する。
DROP TABLE "Account";
DROP TABLE "Session";
DROP TABLE "VerificationToken";

ALTER TABLE "User"
ADD COLUMN "platformUserId" TEXT,
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "passwordHash",
DROP COLUMN "passwordChangeRequired";

CREATE UNIQUE INDEX "User_platformUserId_key" ON "User"("platformUserId");
