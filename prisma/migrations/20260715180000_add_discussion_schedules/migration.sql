-- CreateTable
CREATE TABLE "discussion_schedules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semester" TEXT,
    "discussionDate" TIMESTAMP(3) NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "chairName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_schedule_items" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "projectId" TEXT,
    "slotOrder" INTEGER NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "studentNames" TEXT[],
    "supervisorNames" TEXT[],
    "committeeNames" TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussion_schedules_discussionDate_idx" ON "discussion_schedules"("discussionDate");

-- CreateIndex
CREATE INDEX "discussion_schedules_createdById_idx" ON "discussion_schedules"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_schedule_items_scheduleId_slotOrder_key" ON "discussion_schedule_items"("scheduleId", "slotOrder");

-- CreateIndex
CREATE INDEX "discussion_schedule_items_scheduleId_idx" ON "discussion_schedule_items"("scheduleId");

-- CreateIndex
CREATE INDEX "discussion_schedule_items_projectId_idx" ON "discussion_schedule_items"("projectId");

-- AddForeignKey
ALTER TABLE "discussion_schedules" ADD CONSTRAINT "discussion_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_schedule_items" ADD CONSTRAINT "discussion_schedule_items_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "discussion_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_schedule_items" ADD CONSTRAINT "discussion_schedule_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
