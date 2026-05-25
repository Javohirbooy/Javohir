-- Multi-subject olympiad bundle (backward compatible)

CREATE TABLE "OlympiadBundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeHint" TEXT,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OlympiadBundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OlympiadBundleSubject" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "olympiadId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "titleOverride" TEXT,
    "durationOverrideMinutes" INTEGER,

    CONSTRAINT "OlympiadBundleSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OlympiadBundleParticipant" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "schoolName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT,
    "deviceFpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadBundleParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OlympiadBundleAttempt" (
    "id" TEXT NOT NULL,
    "bundleParticipantId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "totalMaxScore" DOUBLE PRECISION,
    "overallRank" INTEGER,
    "classRank" INTEGER,
    "schoolRank" INTEGER,

    CONSTRAINT "OlympiadBundleAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OlympiadParticipant" ADD COLUMN "bundleParticipantId" TEXT;

ALTER TABLE "OlympiadSession" ADD COLUMN "bundleAttemptId" TEXT;

CREATE UNIQUE INDEX "OlympiadBundle_codeHash_key" ON "OlympiadBundle"("codeHash");
CREATE INDEX "OlympiadBundle_isActive_startsAt_idx" ON "OlympiadBundle"("isActive", "startsAt");
CREATE INDEX "OlympiadBundle_createdById_idx" ON "OlympiadBundle"("createdById");

CREATE UNIQUE INDEX "OlympiadBundleSubject_bundleId_olympiadId_key" ON "OlympiadBundleSubject"("bundleId", "olympiadId");
CREATE INDEX "OlympiadBundleSubject_bundleId_orderIndex_idx" ON "OlympiadBundleSubject"("bundleId", "orderIndex");
CREATE INDEX "OlympiadBundleSubject_olympiadId_idx" ON "OlympiadBundleSubject"("olympiadId");

CREATE INDEX "OlympiadBundleParticipant_bundleId_idx" ON "OlympiadBundleParticipant"("bundleId");
CREATE INDEX "OlympiadBundleParticipant_bundleId_schoolName_idx" ON "OlympiadBundleParticipant"("bundleId", "schoolName");
CREATE INDEX "OlympiadBundleParticipant_bundleId_gradeLabel_idx" ON "OlympiadBundleParticipant"("bundleId", "gradeLabel");

CREATE UNIQUE INDEX "OlympiadBundleAttempt_accessTokenHash_key" ON "OlympiadBundleAttempt"("accessTokenHash");
CREATE UNIQUE INDEX "OlympiadBundleAttempt_bundleParticipantId_bundleId_key" ON "OlympiadBundleAttempt"("bundleParticipantId", "bundleId");
CREATE INDEX "OlympiadBundleAttempt_bundleId_idx" ON "OlympiadBundleAttempt"("bundleId");
CREATE INDEX "OlympiadBundleAttempt_bundleId_completedAt_idx" ON "OlympiadBundleAttempt"("bundleId", "completedAt");

CREATE INDEX "OlympiadParticipant_bundleParticipantId_idx" ON "OlympiadParticipant"("bundleParticipantId");
CREATE INDEX "OlympiadSession_bundleAttemptId_idx" ON "OlympiadSession"("bundleAttemptId");

ALTER TABLE "OlympiadBundle" ADD CONSTRAINT "OlympiadBundle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OlympiadBundleSubject" ADD CONSTRAINT "OlympiadBundleSubject_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "OlympiadBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadBundleSubject" ADD CONSTRAINT "OlympiadBundleSubject_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OlympiadBundleParticipant" ADD CONSTRAINT "OlympiadBundleParticipant_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "OlympiadBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadBundleAttempt" ADD CONSTRAINT "OlympiadBundleAttempt_bundleParticipantId_fkey" FOREIGN KEY ("bundleParticipantId") REFERENCES "OlympiadBundleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadBundleAttempt" ADD CONSTRAINT "OlympiadBundleAttempt_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "OlympiadBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadParticipant" ADD CONSTRAINT "OlympiadParticipant_bundleParticipantId_fkey" FOREIGN KEY ("bundleParticipantId") REFERENCES "OlympiadBundleParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OlympiadSession" ADD CONSTRAINT "OlympiadSession_bundleAttemptId_fkey" FOREIGN KEY ("bundleAttemptId") REFERENCES "OlympiadBundleAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
