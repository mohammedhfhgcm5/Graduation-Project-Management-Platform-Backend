-- CreateTable
CREATE TABLE "_ProjectStudents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectStudents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectSupervisors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectSupervisors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectStudents_B_index" ON "_ProjectStudents"("B");

-- CreateIndex
CREATE INDEX "_ProjectSupervisors_B_index" ON "_ProjectSupervisors"("B");

-- AddForeignKey
ALTER TABLE "_ProjectStudents" ADD CONSTRAINT "_ProjectStudents_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectStudents" ADD CONSTRAINT "_ProjectStudents_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectSupervisors" ADD CONSTRAINT "_ProjectSupervisors_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectSupervisors" ADD CONSTRAINT "_ProjectSupervisors_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing project members into the new relation tables before dropping old columns.
INSERT INTO "_ProjectStudents" ("A", "B")
SELECT "id", "studentId"
FROM "projects";

INSERT INTO "_ProjectSupervisors" ("A", "B")
SELECT "id", "supervisorId"
FROM "projects"
WHERE "supervisorId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_studentId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_supervisorId_fkey";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "studentId",
DROP COLUMN "supervisorId";
