-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('AVAILABLE', 'TAKEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VisitRating" AS ENUM ('POOR', 'FAIR', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FINAL_DISCUSSION', 'SEMINAR');

-- AlterTable
ALTER TABLE "discussion_schedules" ADD COLUMN "type" "ScheduleType" NOT NULL DEFAULT 'FINAL_DISCUSSION';

-- CreateTable
CREATE TABLE "project_ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "techStack" TEXT[],
    "status" "IdeaStatus" NOT NULL DEFAULT 'AVAILABLE',
    "department" TEXT,
    "proposedById" TEXT NOT NULL,
    "claimedByProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "evaluation" TEXT NOT NULL,
    "rating" "VisitRating" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_committee_members" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_committee_members_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "discussion_schedule_item_members" (
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "discussion_schedule_item_members_pkey" PRIMARY KEY ("itemId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_ideas_claimedByProjectId_key" ON "project_ideas"("claimedByProjectId");

-- CreateIndex
CREATE INDEX "project_ideas_status_idx" ON "project_ideas"("status");

-- CreateIndex
CREATE INDEX "project_ideas_proposedById_idx" ON "project_ideas"("proposedById");

-- CreateIndex
CREATE INDEX "visits_projectId_idx" ON "visits"("projectId");

-- CreateIndex
CREATE INDEX "visits_studentId_idx" ON "visits"("studentId");

-- CreateIndex
CREATE INDEX "visits_supervisorId_idx" ON "visits"("supervisorId");

-- CreateIndex
CREATE INDEX "project_committee_members_userId_idx" ON "project_committee_members"("userId");

-- CreateIndex
CREATE INDEX "discussion_schedule_item_members_userId_idx" ON "discussion_schedule_item_members"("userId");

-- CreateIndex
CREATE INDEX "discussion_schedules_type_idx" ON "discussion_schedules"("type");

-- AddForeignKey
ALTER TABLE "project_ideas" ADD CONSTRAINT "project_ideas_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ideas" ADD CONSTRAINT "project_ideas_claimedByProjectId_fkey" FOREIGN KEY ("claimedByProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_committee_members" ADD CONSTRAINT "project_committee_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_committee_members" ADD CONSTRAINT "project_committee_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_schedule_item_members" ADD CONSTRAINT "discussion_schedule_item_members_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "discussion_schedule_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_schedule_item_members" ADD CONSTRAINT "discussion_schedule_item_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
