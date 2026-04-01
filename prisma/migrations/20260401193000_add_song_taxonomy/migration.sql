-- CreateTable
CREATE TABLE "SongTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SongTagOnSong" (
    "songId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("songId", "tagId"),
    CONSTRAINT "SongTagOnSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SongTagOnSong_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SongTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SongCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SongCategoryOnSong" (
    "songId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    PRIMARY KEY ("songId", "categoryId"),
    CONSTRAINT "SongCategoryOnSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SongCategoryOnSong_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SongCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SongTag_name_key" ON "SongTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SongCategory_name_key" ON "SongCategory"("name");
