-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "targetLength" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioClip" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneId" TEXT,
    "url" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoClip" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT,
    "aspectRatio" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "externalTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ko',
    "defaultTone" TEXT NOT NULL DEFAULT 'polite',
    "defaultImageStyle" TEXT NOT NULL DEFAULT 'cinematic',
    "defaultTtsVoice" TEXT NOT NULL DEFAULT 'en-US-Chirp3-HD-Fenrir',
    "scriptModel" TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
    "imageModel" TEXT NOT NULL DEFAULT 'fal-ai/flux/dev',
    "ttsProvider" TEXT NOT NULL DEFAULT 'google',
    "videoProvider" TEXT NOT NULL DEFAULT 'kie',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
