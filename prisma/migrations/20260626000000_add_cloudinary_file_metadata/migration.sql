ALTER TABLE "project_files"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'cloudinary',
ADD COLUMN "cloudinaryPublicId" TEXT,
ADD COLUMN "cloudinaryResourceType" TEXT,
ADD COLUMN "cloudinaryFormat" TEXT;
