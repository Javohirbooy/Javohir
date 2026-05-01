-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Test" ("id", "subjectId", "title") SELECT "id", "subjectId", "title" FROM "Test";
DROP TABLE "Test";
ALTER TABLE "new_Test" RENAME TO "Test";
CREATE INDEX "Test_difficulty_idx" ON "Test"("difficulty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
