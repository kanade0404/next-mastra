-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ja',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "preferredModel" TEXT NOT NULL DEFAULT 'gpt-4',
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "chatRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "usageAlerts" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "modelConfig" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "tokenCount" INTEGER,
    "responseTime" INTEGER,
    "parentMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'chat',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL DEFAULT 0.0,
    "processingTime" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usage_records_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "vectorized" BOOLEAN NOT NULL DEFAULT false,
    "vectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "vectorized" BOOLEAN NOT NULL DEFAULT false,
    "vectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "api_key_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_role_idx" ON "messages"("role");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "usage_records_userId_idx" ON "usage_records"("userId");

-- CreateIndex
CREATE INDEX "usage_records_model_idx" ON "usage_records"("model");

-- CreateIndex
CREATE INDEX "usage_records_purpose_idx" ON "usage_records"("purpose");

-- CreateIndex
CREATE INDEX "usage_records_createdAt_idx" ON "usage_records"("createdAt");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_vectorized_idx" ON "documents"("vectorized");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE INDEX "document_chunks_vectorized_idx" ON "document_chunks"("vectorized");

-- CreateIndex
CREATE INDEX "api_key_usage_service_idx" ON "api_key_usage"("service");

-- CreateIndex
CREATE INDEX "api_key_usage_statusCode_idx" ON "api_key_usage"("statusCode");

-- CreateIndex
CREATE INDEX "api_key_usage_createdAt_idx" ON "api_key_usage"("createdAt");