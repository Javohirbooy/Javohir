-- Add optional avatar URL for teacher/admin profile settings.
ALTER TABLE "User"
ADD COLUMN "avatarUrl" TEXT;
