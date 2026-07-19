-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('kpop', 'anime');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "playerName" TEXT,
    "category" "Category" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "chosenIndex" INTEGER,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "answerMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "playerName" TEXT,
    "category" "Category" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round2Image" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "category" "Category" NOT NULL,
    "silhouetteUrl" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round2Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_category_idx" ON "Session"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Session_ticket_key" ON "Session"("ticket");

-- CreateIndex
CREATE INDEX "Attempt_sessionId_idx" ON "Attempt"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_sessionId_questionId_key" ON "Attempt"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_sessionId_key" ON "Result"("sessionId");

-- CreateIndex
CREATE INDEX "Result_score_totalMs_idx" ON "Result"("score", "totalMs");

-- CreateIndex
CREATE UNIQUE INDEX "Round2Image_position_key" ON "Round2Image"("position");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

