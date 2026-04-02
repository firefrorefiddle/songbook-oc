ALTER TABLE "Song" ADD COLUMN "recommendedVersionId" TEXT REFERENCES "SongVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Song_recommendedVersionId_idx" ON "Song"("recommendedVersionId");
