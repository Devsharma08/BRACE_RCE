-- Create all tables based on Prisma schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    emailVerified BOOLEAN DEFAULT TRUE,
    password TEXT,
    role VARCHAR(50) DEFAULT 'USER',
    avatarUrl TEXT,
    bio TEXT DEFAULT 'try beat me',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- UserProblemProgress
CREATE TABLE IF NOT EXISTS "UserProblemProgress" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    problemId UUID NOT NULL,
    isSolved BOOLEAN DEFAULT FALSE,
    solvedAt TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    lastCode TEXT,
    lastLanguage VARCHAR(50) DEFAULT 'javascript',
    submissionTimes TEXT[] DEFAULT '{}',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_problem_progress_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_problem_progress_problem FOREIGN KEY (problemId) REFERENCES "Problem"(id) ON DELETE CASCADE,
    UNIQUE(userId, problemId)
);

-- Problem
CREATE TABLE IF NOT EXISTS "Problem" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    problem_number INTEGER UNIQUE,
    github_oid VARCHAR(255) UNIQUE,
    problem_definition TEXT,
    problem_hints TEXT[],
    difficulty_level VARCHAR(50),
    creatorId UUID,
    isCustom BOOLEAN DEFAULT FALSE,
    timeLimitMs INTEGER DEFAULT 600000,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    data_structure VARCHAR(255),
    CONSTRAINT fk_problem_creator FOREIGN KEY (creatorId) REFERENCES "User"(id) ON DELETE SET NULL
);

-- TestCase
CREATE TABLE IF NOT EXISTS "TestCase" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input TEXT NOT NULL,
    expectedOutput TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    problemId UUID NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_test_case_problem FOREIGN KEY (problemId) REFERENCES "Problem"(id) ON DELETE CASCADE
);

-- CodeSnippet
CREATE TABLE IF NOT EXISTS "CodeSnippet" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    wrapperCode TEXT,
    problemId UUID NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_code_snippet_problem FOREIGN KEY (problemId) REFERENCES "Problem"(id) ON DELETE CASCADE
);

-- CodeSubmission
CREATE TABLE IF NOT EXISTS "CodeSubmission" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    problemId UUID NOT NULL,
    submittedCode TEXT NOT NULL,
    language VARCHAR(50) DEFAULT 'javascript',
    status VARCHAR(50) DEFAULT 'PENDING',
    runtimeMs INTEGER,
    memoryKb INTEGER,
    passedCase INTEGER DEFAULT 0,
    totalCases INTEGER DEFAULT 0,
    isBestSubmission BOOLEAN DEFAULT FALSE,
    attemptNumber INTEGER DEFAULT 1,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_code_submission_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_code_submission_problem FOREIGN KEY (problemId) REFERENCES "Problem"(id) ON DELETE CASCADE
);

-- Event
CREATE TABLE IF NOT EXISTS "Event" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'PUBLIC',
    status VARCHAR(50) DEFAULT 'WAITING',
    version INTEGER DEFAULT 1,
    isPublic BOOLEAN DEFAULT TRUE,
    description TEXT,
    hostId UUID,
    isTemplate BOOLEAN DEFAULT FALSE,
    commonProblemId UUID,
    roomCode VARCHAR(255) UNIQUE,
    password TEXT,
    maxUsers INTEGER DEFAULT 2,
    totalTimeLimitMs INTEGER,
    startedAt TIMESTAMP,
    finishedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    closesAt TIMESTAMP,
    opensAt TIMESTAMP,
    openedNotified BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_event_host FOREIGN KEY (hostId) REFERENCES "User"(id) ON DELETE SET NULL,
    CONSTRAINT fk_event_common_problem FOREIGN KEY (commonProblemId) REFERENCES "Problem"(id) ON DELETE SET NULL
);

-- EventProblem (join table for Event and Problem)
CREATE TABLE IF NOT EXISTS "EventProblem" (
    eventId UUID NOT NULL,
    problemId UUID NOT NULL,
    PRIMARY KEY (eventId, problemId),
    CONSTRAINT fk_event_problem_event FOREIGN KEY (eventId) REFERENCES "Event"(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_problem_problem FOREIGN KEY (problemId) REFERENCES "Problem"(id) ON DELETE CASCADE
);

-- UserPersonalPerformance
CREATE TABLE IF NOT EXISTS "UserPersonalPerformance" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    eventId UUID NOT NULL,
    questionsSolved INTEGER DEFAULT 0,
    timeTakenMs INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING',
    score INTEGER DEFAULT 0,
    outcome VARCHAR(50),
    battlePoints INTEGER,
    finalPoints INTEGER,
    focusPenaltyPercent INTEGER DEFAULT 0,
    finishedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_performance_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_performance_event FOREIGN KEY (eventId) REFERENCES "Event"(id) ON DELETE CASCADE
);

-- UserFriends (self-referential)
CREATE TABLE IF NOT EXISTS "UserFriends" (
    "User_A" UUID NOT NULL,
    "User_B" UUID NOT NULL,
    PRIMARY KEY ("User_A", "User_B"),
    CONSTRAINT fk_user_friends_a FOREIGN KEY ("User_A") REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_friends_b FOREIGN KEY ("User_B") REFERENCES "User"(id) ON DELETE CASCADE
);

-- EventBlock
CREATE TABLE IF NOT EXISTS "EventBlock" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eventId UUID NOT NULL,
    blockedUserId UUID NOT NULL,
    blockedById UUID NOT NULL,
    reason TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_event_block_event FOREIGN KEY (eventId) REFERENCES "Event"(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_block_blocked_by FOREIGN KEY (blockedById) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_block_blocked_user FOREIGN KEY (blockedUserId) REFERENCES "User"(id) ON DELETE CASCADE,
    UNIQUE(eventId, blockedUserId)
);

-- Message
CREATE TABLE IF NOT EXISTS "Message" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    senderId UUID NOT NULL,
    receiverId UUID NOT NULL,
    data JSONB,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_message_sender FOREIGN KEY (senderId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_receiver FOREIGN KEY (receiverId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    type VARCHAR(50) DEFAULT 'SYSTEM',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(50) DEFAULT 'UNREAD',
    createdAt TIMESTAMP DEFAULT NOW(),
    readAt TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Feedback
CREATE TABLE IF NOT EXISTS "Feedback" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    adminNote TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_feedback_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- QuestionReport
CREATE TABLE IF NOT EXISTS "QuestionReport" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionId UUID NOT NULL,
    reportedBy UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'FLAGGED',
    category VARCHAR(50) DEFAULT 'OTHER',
    detail TEXT,
    resolvedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_question_report_question FOREIGN KEY (questionId) REFERENCES "Problem"(id) ON DELETE CASCADE,
    CONSTRAINT fk_question_report_reporter FOREIGN KEY (reportedBy) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Setting
CREATE TABLE IF NOT EXISTS "Setting" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- MatchmakingQueue
CREATE TABLE IF NOT EXISTS "MatchmakingQueue" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    preferredDifficulty VARCHAR(50),
    status VARCHAR(50) DEFAULT 'WAITING',
    joinedAt TIMESTAMP DEFAULT NOW(),
    matchedAt TIMESTAMP,
    CONSTRAINT fk_matchmaking_queue_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- TemplateSubscription
CREATE TABLE IF NOT EXISTS "TemplateSubscription" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    templateEventId UUID NOT NULL,
    subscribedVersion INTEGER,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_template_subscription_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_subscription_event FOREIGN KEY (templateEventId) REFERENCES "Event"(id) ON DELETE CASCADE,
    UNIQUE(userId, templateEventId)
);

-- UserLearningProgress
CREATE TABLE IF NOT EXISTS "UserLearningProgress" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    learningItemId UUID NOT NULL,
    progressStatus VARCHAR(50) DEFAULT 'NOT_STARTED',
    lastVisited TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_learning_progress_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_learning_progress_item FOREIGN KEY (learningItemId) REFERENCES "LearningItem"(id) ON DELETE CASCADE,
    UNIQUE(userId, learningItemId)
);

-- LearningItem
CREATE TABLE IF NOT EXISTS "LearningItem" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    "order" INTEGER,
    category VARCHAR(255) DEFAULT '',
    description TEXT,
    problemIds TEXT[] DEFAULT '{}',
    nextStructures TEXT[] DEFAULT '{}',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- UserLearningSummary
CREATE TABLE IF NOT EXISTS "UserLearningSummary" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID UNIQUE NOT NULL,
    completedCount INTEGER DEFAULT 0,
    lastUpdated TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_learning_summary_user FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- ExecutionQuota
CREATE TABLE IF NOT EXISTS "ExecutionQuota" (
    keyHash VARCHAR(255) NOT NULL,
    date VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 0,
    updatedAt TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (keyHash, date)
);

-- ExecutionLog
CREATE TABLE IF NOT EXISTS "ExecutionLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyHash VARCHAR(255) NOT NULL,
    userId UUID,
    mode VARCHAR(50) DEFAULT 'RUN',
    origin VARCHAR(255),
    status INTEGER DEFAULT 200,
    durationMs INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- ReportMessage
CREATE TABLE IF NOT EXISTS "ReportMessage" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eventId UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN',
    senderId UUID NOT NULL,
    recipientId UUID NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_report_message_event FOREIGN KEY (eventId) REFERENCES "Event"(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_message_sender FOREIGN KEY (senderId) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_message_recipient FOREIGN KEY (recipientId) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_problem_difficulty ON "Problem"(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_problem_data_structure ON "Problem"(data_structure);
CREATE INDEX IF NOT EXISTS idx_problem_created_at ON "Problem"(createdAt);
CREATE INDEX IF NOT EXISTS idx_test_case_problem ON "TestCase"(problemId);
CREATE INDEX IF NOT EXISTS idx_test_case_public ON "TestCase"(is_public);
CREATE INDEX IF NOT EXISTS idx_code_snippet_problem ON "CodeSnippet"(problemId);
CREATE INDEX IF NOT EXISTS idx_code_snippet_language ON "CodeSnippet"(language);
CREATE INDEX IF NOT EXISTS idx_code_submission_user ON "CodeSubmission"(userId);
CREATE INDEX IF NOT EXISTS idx_code_submission_problem ON "CodeSubmission"(problemId);
CREATE INDEX IF NOT EXISTS idx_event_status ON "Event"(status);
CREATE INDEX IF NOT EXISTS idx_event_type ON "Event"(type);
CREATE INDEX IF NOT EXISTS idx_event_public ON "Event"(isPublic);
CREATE INDEX IF NOT EXISTS idx_event_room_code ON "Event"(roomCode);
CREATE INDEX IF NOT EXISTS idx_event_host ON "Event"(hostId);
CREATE INDEX IF NOT EXISTS idx_event_started_finished ON "Event"(startedAt, finishedAt);
CREATE INDEX IF NOT EXISTS idx_user_performance_user ON "UserPersonalPerformance"(userId);
CREATE INDEX IF NOT EXISTS idx_user_performance_event ON "UserPersonalPerformance"(eventId);
CREATE INDEX IF NOT EXISTS idx_user_performance_status ON "UserPersonalPerformance"(status);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user ON "UserProblemProgress"(userId);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_problem ON "UserProblemProgress"(problemId);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_is_solved ON "UserProblemProgress"(isSolved);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_solved ON "UserProblemProgress"(userId, isSolved);
CREATE INDEX IF NOT EXISTS idx_user_friends_a ON "UserFriends"("User_A");
CREATE INDEX IF NOT EXISTS idx_user_friends_b ON "UserFriends"("User_B");
CREATE INDEX IF NOT EXISTS idx_event_block_event ON "EventBlock"(eventId);
CREATE INDEX IF NOT EXISTS idx_message_sender ON "Message"(senderId);
CREATE INDEX IF NOT EXISTS idx_message_receiver ON "Message"(receiverId);
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(userId);
CREATE INDEX IF NOT EXISTS idx_notification_status_created ON "Notification"(userId, status, createdAt);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON "Feedback"(status, createdAt);
CREATE INDEX IF NOT EXISTS idx_question_report_question ON "QuestionReport"(questionId);
CREATE INDEX IF NOT EXISTS idx_question_report_status ON "QuestionReport"(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_status ON "MatchmakingQueue"(status, preferredDifficulty);
CREATE INDEX IF NOT EXISTS idx_template_subscription_user ON "TemplateSubscription"(userId);
CREATE INDEX IF NOT EXISTS idx_template_subscription_event ON "TemplateSubscription"(templateEventId);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user ON "UserLearningProgress"(userId);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_item ON "UserLearningProgress"(learningItemId);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_status ON "UserLearningProgress"(progressStatus);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user_status ON "UserLearningProgress"(userId, progressStatus);
CREATE INDEX IF NOT EXISTS idx_learning_item_order ON "LearningItem"(order);
CREATE INDEX IF NOT EXISTS idx_learning_item_category ON "LearningItem"(category);
CREATE INDEX IF NOT EXISTS idx_execution_quota_key_date ON "ExecutionQuota"(keyHash, date);
CREATE INDEX IF NOT EXISTS idx_execution_log_key ON "ExecutionLog"(keyHash);
CREATE INDEX IF NOT EXISTS idx_execution_log_key_created ON "ExecutionLog"(keyHash, createdAt);
CREATE INDEX IF NOT EXISTS idx_report_message_event ON "ReportMessage"(eventId);
CREATE INDEX IF NOT EXISTS idx_report_message_sender ON "ReportMessage"(senderId);
CREATE INDEX IF NOT EXISTS idx_report_message_recipient ON "ReportMessage"(recipientId);
