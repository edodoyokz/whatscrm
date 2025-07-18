const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");

// AI Components
const NaturalConversationEngine = require("../ai/natural_conversation_engine");
const MessageProcessor = require("../ai/message_processor");
const ContextManager = require("../ai/context_manager");
const SheetsIntelligence = require("../ai/sheets_intelligence");

// Enhanced AI Routes for Natural Conversation System

/**
 * Initialize user's AI assistant
 */
router.post("/initialize", authenticateToken, async (req, res) => {
    try {
        const { personalityType, industryType, communicationStyle } = req.body;
        
        // Initialize AI components
        await NaturalConversationEngine.initialize();
        await MessageProcessor.initialize();
        await ContextManager.initialize();
        await SheetsIntelligence.initialize();
        
        // Setup user personality if provided
        if (personalityType || industryType || communicationStyle) {
            await setupUserPersonality(req.user.id, {
                personalityType,
                industryType,
                communicationStyle
            });
        }
        
        res.json({
            success: true,
            message: "AI assistant initialized successfully",
            features: {
                naturalConversation: true,
                contextMemory: true,
                realTimeSheets: true,
                personalityDriven: true
            }
        });
    } catch (error) {
        console.error("❌ Error initializing AI:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize AI assistant",
            error: error.message
        });
    }
});

/**
 * Get conversation context
 */
router.get("/context/:phone", authenticateToken, async (req, res) => {
    try {
        const { phone } = req.params;
        
        const context = await ContextManager.getConversationContext(req.user.id, phone);
        const summary = await ContextManager.getConversationSummary(req.user.id, phone);
        
        res.json({
            success: true,
            context,
            summary
        });
    } catch (error) {
        console.error("❌ Error getting conversation context:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get conversation context",
            error: error.message
        });
    }
});

/**
 * Test AI response
 */
router.post("/test-response", 
    authenticateToken,
    [
        body("message").notEmpty().withMessage("Message is required"),
        body("phone").notEmpty().withMessage("Phone number is required")
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { message, phone } = req.body;
            
            const messageData = {
                userId: req.user.id,
                phone,
                message,
                type: "text",
                messageId: `test-${Date.now()}`,
                timestamp: new Date().toISOString()
            };

            const result = await MessageProcessor.processIncomingMessage(messageData);
            
            res.json({
                success: true,
                result,
                testMode: true
            });
        } catch (error) {
            console.error("❌ Error testing AI response:", error);
            res.status(500).json({
                success: false,
                message: "Failed to test AI response",
                error: error.message
            });
        }
    }
);

/**
 * Get real-time sheets data
 */
router.get("/sheets-data/:type", authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const { query } = req.query;
        
        const queryData = query ? JSON.parse(query) : {};
        
        const data = await SheetsIntelligence.getRealtimeData(
            req.user.id,
            type,
            queryData
        );
        
        res.json({
            success: true,
            data,
            type,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Error getting sheets data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get sheets data",
            error: error.message
        });
    }
});

/**
 * Update user personality
 */
router.post("/personality", 
    authenticateToken,
    [
        body("personalityType").optional().isIn(['professional', 'friendly', 'expert', 'caring', 'trendy']),
        body("communicationStyle").optional().isIn(['formal', 'casual', 'mixed']),
        body("responseLength").optional().isIn(['concise', 'detailed', 'balanced']),
        body("emotionalTone").optional().isIn(['enthusiastic', 'calm', 'empathetic', 'confident'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const personalityData = req.body;
            const result = await updateUserPersonality(req.user.id, personalityData);
            
            res.json({
                success: true,
                personality: result,
                message: "Personality updated successfully"
            });
        } catch (error) {
            console.error("❌ Error updating personality:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update personality",
                error: error.message
            });
        }
    }
);

/**
 * Get user personality
 */
router.get("/personality", authenticateToken, async (req, res) => {
    try {
        const personality = await getUserPersonality(req.user.id);
        
        res.json({
            success: true,
            personality
        });
    } catch (error) {
        console.error("❌ Error getting personality:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get personality",
            error: error.message
        });
    }
});

/**
 * Get AI analytics
 */
router.get("/analytics", authenticateToken, async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        
        const analytics = await getAIAnalytics(req.user.id, timeRange);
        
        res.json({
            success: true,
            analytics,
            timeRange
        });
    } catch (error) {
        console.error("❌ Error getting AI analytics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get AI analytics",
            error: error.message
        });
    }
});

/**
 * Update conversation preferences
 */
router.post("/preferences/:phone", 
    authenticateToken,
    async (req, res) => {
        try {
            const { phone } = req.params;
            const preferences = req.body;
            
            const result = await ContextManager.setUserPreferences(
                req.user.id,
                phone,
                preferences
            );
            
            res.json({
                success: true,
                preferences: result,
                message: "Preferences updated successfully"
            });
        } catch (error) {
            console.error("❌ Error updating preferences:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update preferences",
                error: error.message
            });
        }
    }
);

/**
 * Get conversation logs
 */
router.get("/logs", authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, phone } = req.query;
        
        const logs = await getConversationLogs(req.user.id, { page, limit, phone });
        
        res.json({
            success: true,
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: logs.length
            }
        });
    } catch (error) {
        console.error("❌ Error getting conversation logs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get conversation logs",
            error: error.message
        });
    }
});

// Helper functions

async function setupUserPersonality(userId, personalityData) {
    const { dbpromise } = require("../database/dbpromise");
    
    const query = `
        INSERT INTO user_personality (
            user_id, personality_type, industry_type, communication_style, 
            response_length, emotional_tone, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
            personality_type = VALUES(personality_type),
            industry_type = VALUES(industry_type),
            communication_style = VALUES(communication_style),
            response_length = VALUES(response_length),
            emotional_tone = VALUES(emotional_tone),
            updated_at = NOW()
    `;
    
    await dbpromise.execute(query, [
        userId,
        personalityData.personalityType || 'friendly',
        personalityData.industryType || 'general',
        personalityData.communicationStyle || 'casual',
        personalityData.responseLength || 'balanced',
        personalityData.emotionalTone || 'empathetic'
    ]);
}

async function updateUserPersonality(userId, personalityData) {
    const { dbpromise } = require("../database/dbpromise");
    
    const updateFields = [];
    const updateValues = [];
    
    if (personalityData.personalityType) {
        updateFields.push('personality_type = ?');
        updateValues.push(personalityData.personalityType);
    }
    
    if (personalityData.communicationStyle) {
        updateFields.push('communication_style = ?');
        updateValues.push(personalityData.communicationStyle);
    }
    
    if (personalityData.responseLength) {
        updateFields.push('response_length = ?');
        updateValues.push(personalityData.responseLength);
    }
    
    if (personalityData.emotionalTone) {
        updateFields.push('emotional_tone = ?');
        updateValues.push(personalityData.emotionalTone);
    }
    
    if (personalityData.customInstructions) {
        updateFields.push('custom_instructions = ?');
        updateValues.push(personalityData.customInstructions);
    }
    
    if (updateFields.length === 0) {
        throw new Error('No valid personality fields to update');
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);
    
    const query = `UPDATE user_personality SET ${updateFields.join(', ')} WHERE user_id = ?`;
    
    await dbpromise.execute(query, updateValues);
    
    return await getUserPersonality(userId);
}

async function getUserPersonality(userId) {
    const { dbpromise } = require("../database/dbpromise");
    
    const query = `
        SELECT 
            personality_type, communication_style, response_length, emotional_tone,
            brand_voice_settings, industry_type, custom_instructions, greeting_message,
            fallback_responses, created_at, updated_at
        FROM user_personality 
        WHERE user_id = ? AND is_active = TRUE
    `;
    
    const [rows] = await dbpromise.execute(query, [userId]);
    
    return rows.length > 0 ? rows[0] : null;
}

async function getAIAnalytics(userId, timeRange) {
    const { dbpromise } = require("../database/dbpromise");
    
    // Convert timeRange to days
    const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
    
    const query = `
        SELECT 
            COUNT(*) as total_conversations,
            AVG(response_accuracy) as avg_accuracy,
            AVG(user_satisfaction) as avg_satisfaction,
            AVG(response_time) as avg_response_time,
            COUNT(DISTINCT phone) as unique_users,
            SUM(CASE WHEN conversion_achieved = TRUE THEN 1 ELSE 0 END) as conversions
        FROM conversation_analytics 
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    const [rows] = await dbpromise.execute(query, [userId, days]);
    
    return rows[0] || {
        total_conversations: 0,
        avg_accuracy: 0,
        avg_satisfaction: 0,
        avg_response_time: 0,
        unique_users: 0,
        conversions: 0
    };
}

async function getConversationLogs(userId, options = {}) {
    const { dbpromise } = require("../database/dbpromise");
    
    const { page = 1, limit = 50, phone } = options;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            phone, user_message, ai_response, intent_detected, confidence_score,
            response_time, created_at
        FROM ai_response_logs 
        WHERE user_id = ?
    `;
    
    const queryParams = [userId];
    
    if (phone) {
        query += ` AND phone = ?`;
        queryParams.push(phone);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await dbpromise.execute(query, queryParams);
    
    return rows;
}

module.exports = router;
