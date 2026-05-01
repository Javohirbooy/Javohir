-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gradeId" TEXT,
    "avatarEmoji" TEXT DEFAULT '🎓',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL DEFAULT 'emerald'
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageEmoji" TEXT NOT NULL DEFAULT '📘',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Subject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Question_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "answersJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'link',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Material_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Material_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherOnClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    CONSTRAINT "TeacherOnClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherOnClass_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_number_key" ON "Grade"("number");

-- CreateIndex
CREATE INDEX "TestResult_userId_idx" ON "TestResult"("userId");

-- CreateIndex
CREATE INDEX "TestResult_testId_idx" ON "TestResult"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherOnClass_userId_gradeId_key" ON "TeacherOnClass"("userId", "gradeId");
