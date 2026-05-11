-- Olympiad secure exam module

CREATE TABLE "Olympiad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "testId" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL,
    "participantLimit" INTEGER,
    "antiCheatStrictness" TEXT NOT NULL DEFAULT 'STANDARD',
    "resultVisibility" TEXT NOT NULL DEFAULT 'DELAYED',
    "resultsPublishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Olympiad_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Olympiad_slug_key" ON "Olympiad"("slug");
CREATE INDEX "Olympiad_status_startsAt_idx" ON "Olympiad"("status", "startsAt");
CREATE INDEX "Olympiad_testId_idx" ON "Olympiad"("testId");
CREATE INDEX "Olympiad_createdByUserId_idx" ON "Olympiad"("createdByUserId");

CREATE TABLE "OlympiadCode" (
    "id" TEXT NOT NULL,
    "olympiadId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeHint" TEXT,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "oneTimePerParticipant" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OlympiadCode_olympiadId_codeHash_key" ON "OlympiadCode"("olympiadId", "codeHash");
CREATE INDEX "OlympiadCode_olympiadId_idx" ON "OlympiadCode"("olympiadId");

CREATE TABLE "OlympiadParticipant" (
    "id" TEXT NOT NULL,
    "olympiadId" TEXT NOT NULL,
    "codeId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "schoolName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT,
    "deviceFpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadParticipant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OlympiadParticipant_olympiadId_idx" ON "OlympiadParticipant"("olympiadId");

CREATE TABLE "OlympiadSession" (
    "id" TEXT NOT NULL,
    "olympiadId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RULES_PENDING',
    "rulesAcceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "serverEndsAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "lastIpHash" TEXT,
    "userAgentHash" TEXT,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousScore" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OlympiadSession_sessionTokenHash_key" ON "OlympiadSession"("sessionTokenHash");
CREATE INDEX "OlympiadSession_olympiadId_status_idx" ON "OlympiadSession"("olympiadId", "status");
CREATE INDEX "OlympiadSession_olympiadId_lastSeenAt_idx" ON "OlympiadSession"("olympiadId", "lastSeenAt");

CREATE TABLE "OlympiadAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionOrderJson" TEXT NOT NULL,
    "optionPermutationsJson" TEXT NOT NULL DEFAULT '{}',
    "answersJson" TEXT,
    "lastAutoSavedAt" TIMESTAMP(3),

    CONSTRAINT "OlympiadAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OlympiadAttempt_sessionId_key" ON "OlympiadAttempt"("sessionId");

CREATE TABLE "OlympiadViolation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detailJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadViolation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OlympiadViolation_sessionId_idx" ON "OlympiadViolation"("sessionId");
CREATE INDEX "OlympiadViolation_sessionId_createdAt_idx" ON "OlympiadViolation"("sessionId", "createdAt");

CREATE TABLE "OlympiadResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "olympiadId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "answersJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OlympiadResult_sessionId_key" ON "OlympiadResult"("sessionId");
CREATE INDEX "OlympiadResult_olympiadId_published_idx" ON "OlympiadResult"("olympiadId", "published");
CREATE INDEX "OlympiadResult_participantId_idx" ON "OlympiadResult"("participantId");

CREATE TABLE "OlympiadCertificate" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "templateKey" TEXT,
    "issuedAt" TIMESTAMP(3),
    "metaJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "OlympiadCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OlympiadCertificate_resultId_key" ON "OlympiadCertificate"("resultId");

CREATE TABLE "OlympiadInvalidCodeAttempt" (
    "id" TEXT NOT NULL,
    "olympiadId" TEXT,
    "codeHash" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlympiadInvalidCodeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OlympiadInvalidCodeAttempt_ipHash_createdAt_idx" ON "OlympiadInvalidCodeAttempt"("ipHash", "createdAt");

ALTER TABLE "Olympiad" ADD CONSTRAINT "Olympiad_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Olympiad" ADD CONSTRAINT "Olympiad_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Olympiad" ADD CONSTRAINT "Olympiad_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OlympiadCode" ADD CONSTRAINT "OlympiadCode_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadParticipant" ADD CONSTRAINT "OlympiadParticipant_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadParticipant" ADD CONSTRAINT "OlympiadParticipant_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "OlympiadCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OlympiadSession" ADD CONSTRAINT "OlympiadSession_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadSession" ADD CONSTRAINT "OlympiadSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "OlympiadParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadAttempt" ADD CONSTRAINT "OlympiadAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OlympiadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadViolation" ADD CONSTRAINT "OlympiadViolation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OlympiadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadResult" ADD CONSTRAINT "OlympiadResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OlympiadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadResult" ADD CONSTRAINT "OlympiadResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "OlympiadParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadResult" ADD CONSTRAINT "OlympiadResult_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadCertificate" ADD CONSTRAINT "OlympiadCertificate_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OlympiadResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OlympiadInvalidCodeAttempt" ADD CONSTRAINT "OlympiadInvalidCodeAttempt_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
