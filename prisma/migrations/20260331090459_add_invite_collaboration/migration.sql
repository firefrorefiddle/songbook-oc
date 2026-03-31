-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "expiresAt" DATETIME NOT NULL,
    "emailVerifiedAt" DATETIME,
    "usedAt" DATETIME,
    "sentById" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Invite_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "forkedFromId" TEXT,
    CONSTRAINT "Song_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Song_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SongVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Songbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "forkedFromId" TEXT,
    CONSTRAINT "Songbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Songbook_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "Songbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SongbookVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songbookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT,
    "pdfGeneratedAt" DATETIME,
    "pdfLogPath" TEXT,
    CONSTRAINT "SongbookVersion_songbookId_fkey" FOREIGN KEY ("songbookId") REFERENCES "Songbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SongbookSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songbookVersionId" TEXT NOT NULL,
    "songVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "SongbookSong_songbookVersionId_fkey" FOREIGN KEY ("songbookVersionId") REFERENCES "SongbookVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SongbookSong_songVersionId_fkey" FOREIGN KEY ("songVersionId") REFERENCES "SongVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "userId" TEXT NOT NULL,
    "songId" TEXT,
    "songbookId" TEXT,
    CONSTRAINT "Collaboration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Collaboration_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Collaboration_songbookId_fkey" FOREIGN KEY ("songbookId") REFERENCES "Songbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteCollaboration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "resourceType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    CONSTRAINT "InviteCollaboration_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InviteCollaboration_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_userId_key" ON "Invite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Collaboration_userId_songId_key" ON "Collaboration"("userId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "Collaboration_userId_songbookId_key" ON "Collaboration"("userId", "songbookId");
