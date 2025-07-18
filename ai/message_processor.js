const { dbpromise } = require("../database/dbpromise");

/**
 * Message Processor - Enhanced version of processThings.js
 * Handles incoming WhatsApp messages with AI integration
 */
class MessageProcessor {
    constructor() {
        this.activeProcessing = new Map();
        this.processingQueue = [];
        this.naturalEngine = null;
    }

    /**
     * Initialize message processor with AI engine
     */
    async initialize() {
        try {
            // Import AI engine
            const NaturalConversationEngine = require('./natural_conversation_engine');
            this.naturalEngine = NaturalConversationEngine;
            
            if (!this.naturalEngine.initialized) {
                await this.naturalEngine.initialize();
            }
            
            console.log("✅ Message Processor initialized with AI engine");
        } catch (error) {
            console.error("❌ Failed to initialize Message Processor:", error);
            throw error;
        }
    }

    /**
     * Process incoming WhatsApp message
     * @param {Object} messageData - Message data from Baileys
     * @returns {Object} - Processing result
     */
    async processIncomingMessage(messageData) {
        try {
            const { userId, phone, message, type, messageId, timestamp } = messageData;
            
            // Check if message is already being processed
            const processingKey = `${userId}-${phone}-${messageId}`;
            if (this.activeProcessing.has(processingKey)) {
                console.log(`⏳ Message ${messageId} already being processed`);
                return { success: false, reason: 'already_processing' };
            }
            
            // Mark as processing
            this.activeProcessing.set(processingKey, { startTime: Date.now() });
            
            try {
                // Initialize if needed
                if (!this.naturalEngine) {
                    await this.initialize();
                }
                
                // Pre-process message
                const processedMessage = await this.preprocessMessage(messageData);
                
                // Check if user has AI enabled
                const aiEnabled = await this.isAIEnabled(userId);
                if (!aiEnabled) {
                    console.log(`🚫 AI disabled for user ${userId}`);
                    return await this.handleLegacyMessage(processedMessage);
                }
                
                // Process with AI
                const aiResponse = await this.naturalEngine.processMessage(processedMessage);
                
                // Post-process response
                const finalResponse = await this.postprocessResponse(aiResponse, messageData);
                
                // Send response
                await this.sendResponse(userId, phone, finalResponse);
                
                // Clean up
                this.activeProcessing.delete(processingKey);
                
                return {
                    success: true,
                    response: finalResponse,
                    processingTime: Date.now() - this.activeProcessing.get(processingKey)?.startTime
                };
                
            } catch (error) {
                // Clean up on error
                this.activeProcessing.delete(processingKey);
                throw error;
            }
            
        } catch (error) {
            console.error("❌ Error processing incoming message:", error);
            return {
                success: false,
                error: error.message,
                fallbackResponse: await this.generateFallbackResponse(messageData)
            };
        }
    }

    /**
     * Preprocess message before AI processing
     */
    async preprocessMessage(messageData) {
        try {
            const { userId, phone, message, type, messageId, timestamp } = messageData;
            
            // Get user information
            const userInfo = await this.getUserInfo(userId);
            
            // Clean and normalize message
            const cleanMessage = this.cleanMessage(message);
            
            // Extract metadata
            const metadata = await this.extractMetadata(messageData);
            
            return {
                userId,
                phone,
                message: cleanMessage,
                originalMessage: message,
                type,
                messageId,
                timestamp,
                userInfo,
                metadata
            };
        } catch (error) {
            console.error("❌ Error preprocessing message:", error);
            return messageData;
        }
    }

    /**
     * Post-process AI response
     */
    async postprocessResponse(aiResponse, originalMessage) {
        try {
            // Add typing simulation
            const typingDelay = this.calculateTypingDelay(aiResponse.message);
            
            // Add human-like elements
            const humanizedResponse = await this.humanizeResponse(aiResponse);
            
            // Apply user preferences
            const finalResponse = await this.applyUserPreferences(
                humanizedResponse, 
                originalMessage.userId
            );
            
            return {
                ...finalResponse,
                typingDelay,
                originalAI: aiResponse
            };
        } catch (error) {
            console.error("❌ Error post-processing response:", error);
            return aiResponse;
        }
    }

    /**
     * Send response via WhatsApp
     */
    async sendResponse(userId, phone, response) {
        try {
            // Import WhatsApp sender
            const { sendMessageToContact } = require('../helper/addon/qr');
            
            // Simulate typing if configured
            if (response.typingDelay > 0) {
                await this.simulateTyping(userId, phone, response.typingDelay);
            }
            
            // Send actual message
            await sendMessageToContact(userId, phone, response.message, response.type || 'text');
            
            console.log(`✅ Response sent to ${phone} for user ${userId}`);
        } catch (error) {
            console.error("❌ Error sending response:", error);
            throw error;
        }
    }

    /**
     * Check if AI is enabled for user
     */
    async isAIEnabled(userId) {
        try {
            const query = `SELECT ai_enabled FROM users WHERE id = ?`;
            const [rows] = await dbpromise.execute(query, [userId]);
            
            return rows.length > 0 ? rows[0].ai_enabled : false;
        } catch (error) {
            console.error("❌ Error checking AI status:", error);
            return false;
        }
    }

    /**
     * Get user information
     */
    async getUserInfo(userId) {
        try {
            const query = `
                SELECT 
                    id, name, email, phone, plan, 
                    ai_enabled, ai_model_preference, max_conversation_memory,
                    ai_response_delay
                FROM users 
                WHERE id = ?
            `;
            const [rows] = await dbpromise.execute(query, [userId]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("❌ Error getting user info:", error);
            return null;
        }
    }

    /**
     * Clean and normalize message
     */
    cleanMessage(message) {
        if (!message || typeof message !== 'string') {
            return '';
        }
        
        // Remove extra whitespace
        let cleaned = message.trim();
        
        // Remove multiple spaces
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Basic sanitization
        cleaned = cleaned.replace(/[<>]/g, '');
        
        return cleaned;
    }

    /**
     * Extract metadata from message
     */
    async extractMetadata(messageData) {
        try {
            const metadata = {
                timestamp: messageData.timestamp || new Date().toISOString(),
                messageLength: messageData.message?.length || 0,
                hasMedia: messageData.type !== 'text',
                isReply: messageData.isReply || false,
                quotedMessage: messageData.quotedMessage || null
            };
            
            return metadata;
        } catch (error) {
            console.error("❌ Error extracting metadata:", error);
            return {};
        }
    }

    /**
     * Calculate typing delay for human-like response
     */
    calculateTypingDelay(message) {
        if (!message || typeof message !== 'string') {
            return 1000;
        }
        
        // Base delay + words per minute calculation
        const baseDelay = 1000; // 1 second
        const wordsPerMinute = 40; // Average typing speed
        const words = message.split(' ').length;
        const typingTime = (words / wordsPerMinute) * 60 * 1000; // Convert to milliseconds
        
        // Cap at 5 seconds max
        return Math.min(baseDelay + typingTime, 5000);
    }

    /**
     * Humanize AI response
     */
    async humanizeResponse(aiResponse) {
        try {
            // Add natural variations
            const humanizedMessage = await this.addNaturalVariations(aiResponse.message);
            
            // Add conversational elements
            const conversationalMessage = await this.addConversationalElements(humanizedMessage);
            
            return {
                ...aiResponse,
                message: conversationalMessage,
                humanized: true
            };
        } catch (error) {
            console.error("❌ Error humanizing response:", error);
            return aiResponse;
        }
    }

    /**
     * Add natural variations to response
     */
    async addNaturalVariations(message) {
        // This will be enhanced with actual variation logic
        return message;
    }

    /**
     * Add conversational elements
     */
    async addConversationalElements(message) {
        // This will be enhanced with actual conversational elements
        return message;
    }

    /**
     * Apply user preferences to response
     */
    async applyUserPreferences(response, userId) {
        try {
            const userInfo = await this.getUserInfo(userId);
            
            if (userInfo && userInfo.ai_response_delay) {
                response.typingDelay = userInfo.ai_response_delay;
            }
            
            return response;
        } catch (error) {
            console.error("❌ Error applying user preferences:", error);
            return response;
        }
    }

    /**
     * Simulate typing indicator
     */
    async simulateTyping(userId, phone, delay) {
        try {
            // This will be implemented with actual typing simulation
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            console.error("❌ Error simulating typing:", error);
        }
    }

    /**
     * Handle legacy messages (non-AI)
     */
    async handleLegacyMessage(messageData) {
        try {
            // Fallback to existing flow system
            const { processFlowMessage } = require('../automation/automation');
            return await processFlowMessage(messageData);
        } catch (error) {
            console.error("❌ Error handling legacy message:", error);
            return this.generateFallbackResponse(messageData);
        }
    }

    /**
     * Generate fallback response
     */
    async generateFallbackResponse(messageData) {
        return {
            message: "Thank you for your message. I'm currently experiencing some technical difficulties. Please try again in a moment.",
            type: 'text',
            confidence: 0.0,
            intent: 'fallback',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new MessageProcessor();
