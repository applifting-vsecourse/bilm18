-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "rootId" TEXT,
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quack_parentId_idx" ON "quack"("parentId");

-- CreateIndex
CREATE INDEX "quack_rootId_idx" ON "quack"("rootId");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quack"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "quack"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Written by hand: Prisma can't express CHECK constraints in the schema.
-- docs/adr/0001 — a row is either a live quack (text + author) or a
-- tombstone (deleted while it had replies: no text, author or mood).
ALTER TABLE "quack" ADD CONSTRAINT "quack_tombstone_check" CHECK (
  ("deletedAt" IS NULL AND "text" IS NOT NULL AND "userId" IS NOT NULL)
  OR
  ("deletedAt" IS NOT NULL AND "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL)
);

-- A reply has both a parent and a thread root; a top-level quack has neither.
ALTER TABLE "quack" ADD CONSTRAINT "quack_thread_check" CHECK (
  ("parentId" IS NULL) = ("rootId" IS NULL)
);
