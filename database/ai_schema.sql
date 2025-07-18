-- Phase 1: Database Schema Enhancement for Natural AI Assistant
-- Created: 2025-01-18
-- Purpose: Support conversation memory, personality, and real-time intelligence

-- Table: conversation_memory
-- Stores conversation context and history for natural AI responses
CREATE TABLE IF NOT EXISTS conversation_memory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    conversation_id VARCHAR(100) NOT NULL,
    message_history JSON,
    context_data JSON,
    intent_history JSON,
    emotional_state VARCHAR(50),
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_phone (user_id, phone),
    INDEX idx_conversation (conversation_id),
    INDEX idx_last_interaction (last_interaction)
);

-- Table: user_personality
-- Stores AI personality configuration for each user
CREATE TABLE IF NOT EXISTS user_personality (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    personality_type ENUM('professional', 'friendly', 'expert', 'caring', 'trendy') DEFAULT 'friendly',
    communication_style ENUM('formal', 'casual', 'mixed') DEFAULT 'casual',
    response_length ENUM('concise', 'detailed', 'balanced') DEFAULT 'balanced',
    emotional_tone ENUM('enthusiastic', 'calm', 'empathetic', 'confident') DEFAULT 'empathetic',
    brand_voice_settings JSON,
    industry_type VARCHAR(100),
    custom_instructions TEXT,
    greeting_message TEXT,
    fallback_responses JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_personality (user_id)
);

-- Table: ai_knowledge_cache
-- Caches real-time Google Sheets data for AI responses
CREATE TABLE IF NOT EXISTS ai_knowledge_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sheet_id VARCHAR(100) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    data_type ENUM('inventory', 'services', 'rooms', 'restaurant', 'custom') DEFAULT 'inventory',
    cached_data JSON,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    sync_frequency INT DEFAULT 30, -- seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sheet (user_id, sheet_id),
    INDEX idx_last_sync (last_sync),
    INDEX idx_data_type (data_type)
);

-- Table: conversation_analytics
-- Tracks conversation metrics and AI performance
CREATE TABLE IF NOT EXISTS conversation_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    conversation_id VARCHAR(100) NOT NULL,
    message_count INT DEFAULT 0,
    response_accuracy FLOAT DEFAULT 0.0,
    user_satisfaction FLOAT DEFAULT 0.0,
    conversation_duration INT DEFAULT 0, -- seconds
    intent_recognition_score FLOAT DEFAULT 0.0,
    business_outcome ENUM('none', 'inquiry', 'booking', 'sale', 'support') DEFAULT 'none',
    conversion_achieved BOOLEAN DEFAULT FALSE,
    ai_model_used VARCHAR(50),
    total_response_time INT DEFAULT 0, -- milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_phone (user_id, phone),
    INDEX idx_conversation (conversation_id),
    INDEX idx_business_outcome (business_outcome),
    INDEX idx_created_at (created_at)
);

-- Table: ai_response_logs
-- Logs AI responses for quality monitoring and improvement
CREATE TABLE IF NOT EXISTS ai_response_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    conversation_id VARCHAR(100) NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    intent_detected VARCHAR(100),
    confidence_score FLOAT DEFAULT 0.0,
    context_used JSON,
    sheets_data_used JSON,
    response_time INT DEFAULT 0, -- milliseconds
    personality_applied JSON,
    feedback_score FLOAT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_phone (user_id, phone),
    INDEX idx_conversation (conversation_id),
    INDEX idx_intent (intent_detected),
    INDEX idx_created_at (created_at)
);

-- Table: ai_learning_data
-- Stores data for AI learning and improvement
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    data_type ENUM('successful_pattern', 'failed_pattern', 'user_feedback', 'optimization') DEFAULT 'successful_pattern',
    pattern_data JSON,
    success_rate FLOAT DEFAULT 0.0,
    usage_count INT DEFAULT 0,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_data_type (user_id, data_type),
    INDEX idx_success_rate (success_rate),
    INDEX idx_last_used (last_used)
);

-- Add AI-related columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_model_preference ENUM('gpt-3.5-turbo', 'gpt-4', 'gemini-pro') DEFAULT 'gpt-3.5-turbo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_conversation_memory INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_response_delay INT DEFAULT 1000; -- milliseconds

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_ai_enabled ON users(ai_enabled);
CREATE INDEX IF NOT EXISTS idx_users_ai_model ON users(ai_model_preference);

-- Insert default personality templates
INSERT INTO user_personality (user_id, personality_type, communication_style, response_length, emotional_tone, brand_voice_settings, industry_type, custom_instructions, greeting_message, fallback_responses)
SELECT 
    u.id,
    'friendly',
    'casual',
    'balanced',
    'empathetic',
    '{"tone": "helpful", "style": "conversational", "formality": "casual"}',
    'general',
    'Be helpful, friendly, and natural in all responses. Always try to provide value and assistance.',
    'Hi there! How can I help you today?',
    '["I\'m here to help! Could you tell me more about what you need?", "Let me assist you with that. What specific information are you looking for?", "I\'d be happy to help! Can you provide more details?"]'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM user_personality)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
