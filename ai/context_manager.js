const { dbpromise } = require("../database/dbpromise");

/**
 * Context Manager - Handles conversation context and memory
 * Provides natural conversation flow with memory persistence
 */
class ContextManager {
    constructor() {
        this.memoryCache = new Map();
        this.contextCache = new Map();
        this.maxMemorySize = 50; // Maximum messages to remember
        this.memoryTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.initialized = false;
    }

    /**
     * Initialize context manager with proper cleanup
     */
    async initialize() {
        try {
            console.log("🧠 Initializing Context Manager...");
            
            // Load active conversations into memory
            await this.loadActiveConversations();
            
            // Setup memory cleanup
            this.setupMemoryCleanup();
            
            // Setup graceful shutdown handler
            this.setupGracefulShutdown();
            
            this.initialized = true;
            console.log("✅ Context Manager initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Context Manager:", error);
            throw error;
        }
    }

    /**
     * Get conversation context
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @returns {Object} - Conversation context
     */
    async getConversationContext(userId, phone) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const contextKey = `${userId}-${phone}`;
            
            // Check cache first
            let context = this.contextCache.get(contextKey);
            
            if (!context) {
                // Load from database
                context = await this.loadContextFromDatabase(userId, phone);
                
                // Cache for future use
                this.contextCache.set(contextKey, context);
            }
            
            return context;
        } catch (error) {
            console.error("❌ Error getting conversation context:", error);
            return this.createEmptyContext(userId, phone);
        }
    }

    /**
     * Update conversation context
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @param {Object} newContext - New context data
     */
    async updateConversationContext(userId, phone, newContext) {
        try {
            const contextKey = `${userId}-${phone}`;
            
            // Get existing context
            const existingContext = await this.getConversationContext(userId, phone);
            
            // Merge contexts
            const mergedContext = this.mergeContexts(existingContext, newContext);
            
            // Update cache
            this.contextCache.set(contextKey, mergedContext);
            
            // Update database
            await this.saveContextToDatabase(userId, phone, mergedContext);
            
            return mergedContext;
        } catch (error) {
            console.error("❌ Error updating conversation context:", error);
            throw error;
        }
    }

    /**
     * Add message to conversation memory
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @param {Object} message - Message object
     * @param {string} type - Message type ('user' or 'ai')
     */
    async addMessageToMemory(userId, phone, message, type = 'user') {
        try {
            const context = await this.getConversationContext(userId, phone);
            
            // Create message object
            const messageObj = {
                type,
                content: message.content || message,
                timestamp: new Date().toISOString(),
                intent: message.intent || null,
                confidence: message.confidence || null,
                metadata: message.metadata || {}
            };
            
            // Add to memory
            context.messageHistory.push(messageObj);
            
            // Trim memory if too large
            if (context.messageHistory.length > this.maxMemorySize) {
                context.messageHistory = context.messageHistory.slice(-this.maxMemorySize);
            }
            
            // Update context
            await this.updateConversationContext(userId, phone, context);
            
            return messageObj;
        } catch (error) {
            console.error("❌ Error adding message to memory:", error);
            throw error;
        }
    }

    /**
     * Get conversation summary
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @returns {Object} - Conversation summary
     */
    async getConversationSummary(userId, phone) {
        try {
            const context = await this.getConversationContext(userId, phone);
            
            const summary = {
                totalMessages: context.messageHistory.length,
                userMessages: context.messageHistory.filter(m => m.type === 'user').length,
                aiMessages: context.messageHistory.filter(m => m.type === 'ai').length,
                lastInteraction: context.lastInteraction,
                dominantIntents: this.getDominantIntents(context.intentHistory),
                conversationTone: context.emotionalState || 'neutral',
                topicHistory: this.extractTopics(context.messageHistory),
                duration: this.calculateConversationDuration(context),
                engagementLevel: this.calculateEngagementLevel(context)
            };
            
            return summary;
        } catch (error) {
            console.error("❌ Error getting conversation summary:", error);
            return {};
        }
    }

    /**
     * Extract relevant context for AI
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @param {number} messageCount - Number of recent messages to include
     * @returns {Object} - AI-relevant context
     */
    async getAIContext(userId, phone, messageCount = 10) {
        try {
            const context = await this.getConversationContext(userId, phone);
            
            // Get recent messages
            const recentMessages = context.messageHistory.slice(-messageCount);
            
            // Extract context for AI
            const aiContext = {
                recentMessages,
                dominantIntents: this.getDominantIntents(context.intentHistory),
                emotionalState: context.emotionalState || 'neutral',
                conversationStage: this.determineConversationStage(context),
                userPreferences: context.userPreferences || {},
                businessContext: context.businessContext || {},
                lastInteraction: context.lastInteraction,
                conversationFlow: this.analyzeConversationFlow(recentMessages)
            };
            
            return aiContext;
        } catch (error) {
            console.error("❌ Error getting AI context:", error);
            return {};
        }
    }

    /**
     * Set user preferences
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @param {Object} preferences - User preferences
     */
    async setUserPreferences(userId, phone, preferences) {
        try {
            const context = await this.getConversationContext(userId, phone);
            
            context.userPreferences = {
                ...context.userPreferences,
                ...preferences,
                lastUpdated: new Date().toISOString()
            };
            
            await this.updateConversationContext(userId, phone, context);
            
            return context.userPreferences;
        } catch (error) {
            console.error("❌ Error setting user preferences:", error);
            throw error;
        }
    }

    /**
     * Update emotional state
     * @param {number} userId - User ID
     * @param {string} phone - Phone number
     * @param {string} emotionalState - New emotional state
     */
    async updateEmotionalState(userId, phone, emotionalState) {
        try {
            const context = await this.getConversationContext(userId, phone);
            
            context.emotionalState = emotionalState;
            context.emotionalHistory = context.emotionalHistory || [];
            context.emotionalHistory.push({
                state: emotionalState,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 20 emotional states
            if (context.emotionalHistory.length > 20) {
                context.emotionalHistory = context.emotionalHistory.slice(-20);
            }
            
            await this.updateConversationContext(userId, phone, context);
            
            return emotionalState;
        } catch (error) {
            console.error("❌ Error updating emotional state:", error);
            throw error;
        }
    }

    /**
     * Load context from database
     */
    async loadContextFromDatabase(userId, phone) {
        try {
            const query = `
                SELECT 
                    message_history, 
                    context_data, 
                    intent_history, 
                    emotional_state,
                    last_interaction
                FROM conversation_memory 
                WHERE user_id = ? AND phone = ?
                ORDER BY last_interaction DESC 
                LIMIT 1
            `;
            
            const [rows] = await dbpromise.execute(query, [userId, phone]);
            
            if (rows.length > 0) {
                return {
                    messageHistory: JSON.parse(rows[0].message_history || '[]'),
                    contextData: JSON.parse(rows[0].context_data || '{}'),
                    intentHistory: JSON.parse(rows[0].intent_history || '[]'),
                    emotionalState: rows[0].emotional_state || 'neutral',
                    lastInteraction: rows[0].last_interaction,
                    userPreferences: {},
                    businessContext: {}
                };
            }
            
            return this.createEmptyContext(userId, phone);
        } catch (error) {
            console.error("❌ Error loading context from database:", error);
            return this.createEmptyContext(userId, phone);
        }
    }

    /**
     * Save context to database
     */
    async saveContextToDatabase(userId, phone, context) {
        try {
            const conversationId = `${userId}-${phone}`;
            
            const query = `
                INSERT INTO conversation_memory (
                    user_id, phone, conversation_id, message_history, 
                    context_data, intent_history, emotional_state, last_interaction
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    message_history = VALUES(message_history),
                    context_data = VALUES(context_data),
                    intent_history = VALUES(intent_history),
                    emotional_state = VALUES(emotional_state),
                    last_interaction = NOW(),
                    updated_at = NOW()
            `;
            
            await dbpromise.execute(query, [
                userId,
                phone,
                conversationId,
                JSON.stringify(context.messageHistory || []),
                JSON.stringify(context.contextData || {}),
                JSON.stringify(context.intentHistory || []),
                context.emotionalState || 'neutral'
            ]);
        } catch (error) {
            console.error("❌ Error saving context to database:", error);
        }
    }

    /**
     * Create empty context
     */
    createEmptyContext(userId, phone) {
        return {
            messageHistory: [],
            contextData: {},
            intentHistory: [],
            emotionalState: 'neutral',
            emotionalHistory: [],
            userPreferences: {},
            businessContext: {},
            lastInteraction: null,
            conversationStart: new Date().toISOString()
        };
    }

    /**
     * Merge contexts
     */
    mergeContexts(existing, newContext) {
        return {
            ...existing,
            ...newContext,
            messageHistory: newContext.messageHistory || existing.messageHistory,
            contextData: { ...existing.contextData, ...newContext.contextData },
            lastInteraction: new Date().toISOString()
        };
    }

    /**
     * Get dominant intents
     */
    getDominantIntents(intentHistory) {
        try {
            const intentCounts = {};
            
            intentHistory.forEach(intent => {
                intentCounts[intent.intent] = (intentCounts[intent.intent] || 0) + 1;
            });
            
            return Object.entries(intentCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([intent, count]) => ({ intent, count }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Extract topics from messages
     */
    extractTopics(messageHistory) {
        try {
            // This will be enhanced with actual topic extraction
            const topics = [];
            
            messageHistory.forEach(message => {
                if (message.metadata && message.metadata.topics) {
                    topics.push(...message.metadata.topics);
                }
            });
            
            return [...new Set(topics)];
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate conversation duration
     */
    calculateConversationDuration(context) {
        try {
            if (!context.conversationStart) return 0;
            
            const start = new Date(context.conversationStart);
            const end = context.lastInteraction ? new Date(context.lastInteraction) : new Date();
            
            return Math.floor((end - start) / 1000); // Duration in seconds
        } catch (error) {
            return 0;
        }
    }

    /**
     * Calculate engagement level
     */
    calculateEngagementLevel(context) {
        try {
            const messageCount = context.messageHistory.length;
            const duration = this.calculateConversationDuration(context);
            
            if (duration === 0) return 0;
            
            // Messages per minute
            const messagesPerMinute = messageCount / (duration / 60);
            
            // Engagement score (0-1)
            return Math.min(messagesPerMinute / 5, 1);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Determine conversation stage
     */
    determineConversationStage(context) {
        try {
            const messageCount = context.messageHistory.length;
            
            if (messageCount === 0) return 'initial';
            if (messageCount <= 3) return 'greeting';
            if (messageCount <= 10) return 'inquiry';
            if (messageCount <= 20) return 'engagement';
            return 'advanced';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Analyze conversation flow
     */
    analyzeConversationFlow(messages) {
        try {
            if (!messages || messages.length === 0) return 'none';
            
            const recentIntents = messages
                .filter(m => m.intent)
                .map(m => m.intent)
                .slice(-5);
            
            // Determine flow pattern
            if (recentIntents.includes('product_inquiry')) return 'product_focused';
            if (recentIntents.includes('booking_request')) return 'booking_focused';
            if (recentIntents.includes('support_request')) return 'support_focused';
            if (recentIntents.includes('general_inquiry')) return 'information_seeking';
            
            return 'general_conversation';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Load active conversations
     */
    async loadActiveConversations() {
        try {
            const query = `
                SELECT user_id, phone, conversation_id, last_interaction
                FROM conversation_memory 
                WHERE last_interaction > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY last_interaction DESC
            `;
            
            const [rows] = await dbpromise.execute(query);
            
            console.log(`🔄 Loaded ${rows.length} active conversations into memory`);
        } catch (error) {
            console.error("❌ Error loading active conversations:", error);
        }
    }

    /**
     * Setup memory cleanup with proper cleanup
     */
    setupMemoryCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldConversations();
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Setup graceful shutdown handler
     */
    setupGracefulShutdown() {
        process.on('SIGTERM', () => {
            console.log('🧹 Cleaning up Context Manager...');
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            this.contextCache.clear();
            this.memoryCache.clear();
            console.log('✅ Context Manager cleaned up');
        });
    }

    /**
     * Cleanup old conversations
     */
    async cleanupOldConversations() {
        try {
            const cutoffTime = Date.now() - this.memoryTimeout;
            
            // Clean up memory cache
            for (const [key, context] of this.contextCache.entries()) {
                if (context.lastInteraction && new Date(context.lastInteraction).getTime() < cutoffTime) {
                    this.contextCache.delete(key);
                }
            }
            
            console.log(`🧹 Cleaned up old conversations from memory`);
        } catch (error) {
            console.error("❌ Error cleaning up old conversations:", error);
        }
    }
}

module.exports = new ContextManager();
