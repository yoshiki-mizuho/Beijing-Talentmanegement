ALTER TABLE "Notification"
ADD COLUMN "actorMemberId" TEXT;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_actorMemberId_fkey"
FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Notification_actorMemberId_idx"
ON "Notification"("actorMemberId");
