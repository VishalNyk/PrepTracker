/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `TopicCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TopicCategory_name_key";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "TopicCategory" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TopicCategory_userId_name_key" ON "TopicCategory"("userId", "name");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCategory" ADD CONSTRAINT "TopicCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
