const { dbpromise } = require("../database/dbpromise");
const contextManager = require('./context_manager');
const sheetsIntelligence = require('./sheets_intelligence');
const personalityEngine = require('./personality_engine');
const aiProviderManager = require('./ai_provider_manager');
const naturalLanguageProcessor = require('./natural_language_processor');

/**
 * Natural Conversation Engine - Core AI System
 * Handles natural language processing and conversation management
 */
class NaturalConversationEngine {
    constructor() {
        this.conversationCache = new Map();
        this.processingQueue = [];
        this.initialized = false;
    }

    /**
     * Initialize the conversation engine
     */
    async initialize() {
        try {
            console.log("🤖 Initializing Natural Conversation Engine...");
            
            // Initialize all AI components
            await aiProviderManager.initialize();
            await personalityEngine.initialize();
            await naturalLanguageProcessor.initialize();
            await contextManager.initialize();
            await sheetsIntelligence.initialize();
            
            // Load AI configurations
            await this.loadAIConfigurations();
            
            // Initialize conversation memory
            await this.initializeConversationMemory();
            
            // Setup real-time listeners
            await this.setupRealTimeListeners();
            
            this.initialized = true;
            console.log("✅ Natural Conversation Engine initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Natural Conversation Engine:", error);
            throw error;
        }
    }

    /**
     * Process incoming message with natural AI
     * @param {Object} messageData - Message data from WhatsApp
     * @returns {Object} - AI response data
     */
    async processMessage(messageData) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const { userId, phone, message, type = 'text' } = messageData;
            
            // Load conversation context
            const context = await this.loadConversationContext(userId, phone);
            
            // Get user personality
            const personality = await this.getUserPersonality(userId);
            
            // Load real-time knowledge
            const knowledge = await this.loadRealTimeKnowledge(userId);
            
            // Generate natural response
            const response = await this.generateNaturalResponse({
                userId,
                phone,
                message,
                type,
                context,
                personality,
                knowledge
            });
            
            // Update conversation memory
            await this.updateConversationMemory(userId, phone, message, response);
            
            // Log for analytics
            await this.logConversation(userId, phone, message, response);
            
            return response;
        } catch (error) {
            console.error("❌ Error processing message:", error);
            return this.generateErrorResponse(error);
        }
    }

    /**
     * Load conversation context for natural responses
     */
    async loadConversationContext(userId, phone) {
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
                    emotionalState: rows[0].emotional_state,
                    lastInteraction: rows[0].last_interaction
                };
            }
            
            return {
                messageHistory: [],
                contextData: {},
                intentHistory: [],
                emotionalState: 'neutral',
                lastInteraction: null
            };
        } catch (error) {
            console.error("❌ Error loading conversation context:", error);
            return {
                messageHistory: [],
                contextData: {},
                intentHistory: [],
                emotionalState: 'neutral',
                lastInteraction: null
            };
        }
    }

    /**
     * Get user personality configuration
     */
    async getUserPersonality(userId) {
        try {
            const query = `
                SELECT 
                    personality_type,
                    communication_style,
                    response_length,
                    emotional_tone,
                    brand_voice_settings,
                    industry_type,
                    custom_instructions,
                    greeting_message,
                    fallback_responses
                FROM user_personality 
                WHERE user_id = ? AND is_active = TRUE
            `;
            
            const [rows] = await dbpromise.execute(query, [userId]);
            
            if (rows.length > 0) {
                return {
                    personalityType: rows[0].personality_type,
                    communicationStyle: rows[0].communication_style,
                    responseLength: rows[0].response_length,
                    emotionalTone: rows[0].emotional_tone,
                    brandVoiceSettings: JSON.parse(rows[0].brand_voice_settings || '{}'),
                    industryType: rows[0].industry_type,
                    customInstructions: rows[0].custom_instructions,
                    greetingMessage: rows[0].greeting_message,
                    fallbackResponses: JSON.parse(rows[0].fallback_responses || '[]')
                };
            }
            
            // Return default personality if not configured
            return {
                personalityType: 'friendly',
                communicationStyle: 'casual',
                responseLength: 'balanced',
                emotionalTone: 'empathetic',
                brandVoiceSettings: { tone: 'helpful', style: 'conversational' },
                industryType: 'general',
                customInstructions: 'Be helpful, friendly, and natural in all responses.',
                greetingMessage: 'Hi there! How can I help you today?',
                fallbackResponses: ['I\'m here to help! Could you tell me more about what you need?']
            };
        } catch (error) {
            console.error("❌ Error getting user personality:", error);
            return {
                personalityType: 'friendly',
                communicationStyle: 'casual',
                responseLength: 'balanced',
                emotionalTone: 'empathetic',
                brandVoiceSettings: { tone: 'helpful', style: 'conversational' },
                industryType: 'general',
                customInstructions: 'Be helpful, friendly, and natural in all responses.',
                greetingMessage: 'Hi there! How can I help you today?',
                fallbackResponses: ['I\'m here to help! Could you tell me more about what you need?']
            };
        }
    }

    /**
     * Load real-time knowledge from Google Sheets
     */
    async loadRealTimeKnowledge(userId) {
        try {
            const query = `
                SELECT 
                    sheet_id,
                    sheet_name,
                    data_type,
                    cached_data,
                    last_sync
                FROM ai_knowledge_cache 
                WHERE user_id = ? AND is_valid = TRUE
                ORDER BY last_sync DESC
            `;
            
            const [rows] = await dbpromise.execute(query, [userId]);
            
            const knowledge = {
                inventory: [],
                services: [],
                rooms: [],
                restaurant: [],
                custom: []
            };
            
            for (const row of rows) {
                const data = JSON.parse(row.cached_data || '[]');
                knowledge[row.data_type] = data;
            }
            
            return knowledge;
        } catch (error) {
            console.error("❌ Error loading real-time knowledge:", error);
            return {
                inventory: [],
                services: [],
                rooms: [],
                restaurant: [],
                custom: []
            };
        }
    }

    /**
     * Generate natural AI response
     */
    async generateNaturalResponse(params) {
        try {
            const { userId, phone, message, context, personality, knowledge } = params;
            
            // Step 1: Process with NLP
            const nlpAnalysis = await naturalLanguageProcessor.processInput(message, context);
            
            // Step 2: Create AI prompt with context
            const aiPrompt = await this.createAIPrompt(message, {
                context,
                personality,
                knowledge,
                nlpAnalysis
            });
            
            // Step 3: Generate AI response
            const aiResponse = await aiProviderManager.generateResponse(aiPrompt, context, {
                maxTokens: this.determineResponseLength(nlpAnalysis),
                temperature: this.determineResponseTemperature(nlpAnalysis),
                systemMessage: this.createSystemMessage(personality, nlpAnalysis)
            });
            
            // Step 4: Apply personality transformation
            const personalizedResponse = await personalityEngine.applyPersonality(
                aiResponse.content,
                personality,
                context
            );
            
            // Step 5: Apply final refinements
            const finalResponse = await this.applyFinalRefinements(
                personalizedResponse,
                nlpAnalysis,
                context
            );
            
            return {
                message: finalResponse,
                type: 'text',
                confidence: aiResponse.success ? 0.95 : 0.7,
                intent: nlpAnalysis.intent.name,
                emotion: nlpAnalysis.emotion.name,
                context: context,
                personality: personality,
                metadata: {
                    nlpAnalysis,
                    aiProvider: aiResponse.provider,
                    personalityApplied: true,
                    knowledgeUsed: Object.keys(knowledge).length > 0,
                    responseStrategy: nlpAnalysis.strategy
                },
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - params.startTime
            };
        } catch (error) {
            console.error("❌ Error generating natural response:", error);
            return this.generateErrorResponse(error);
        }
    }

    /**
     * Update conversation memory
     */
    async updateConversationMemory(userId, phone, userMessage, aiResponse) {
        try {
            const conversationId = `${userId}-${phone}`;
            
            // Load existing memory
            const context = await this.loadConversationContext(userId, phone);
            
            // Update message history
            context.messageHistory.push({
                type: 'user',
                message: userMessage,
                timestamp: new Date().toISOString()
            });
            
            context.messageHistory.push({
                type: 'ai',
                message: aiResponse.message,
                timestamp: new Date().toISOString(),
                intent: aiResponse.intent,
                confidence: aiResponse.confidence
            });
            
            // Keep only last 50 messages
            if (context.messageHistory.length > 50) {
                context.messageHistory = context.messageHistory.slice(-50);
            }
            
            // Update intent history
            context.intentHistory.push({
                intent: aiResponse.intent,
                confidence: aiResponse.confidence,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 20 intents
            if (context.intentHistory.length > 20) {
                context.intentHistory = context.intentHistory.slice(-20);
            }
            
            // Upsert conversation memory
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
                JSON.stringify(context.messageHistory),
                JSON.stringify(context.contextData),
                JSON.stringify(context.intentHistory),
                'neutral' // Will be enhanced with emotion detection
            ]);
            
        } catch (error) {
            console.error("❌ Error updating conversation memory:", error);
        }
    }

    /**
     * Log conversation for analytics
     */
    async logConversation(userId, phone, userMessage, aiResponse) {
        try {
            const conversationId = `${userId}-${phone}`;
            
            const query = `
                INSERT INTO ai_response_logs (
                    user_id, phone, conversation_id, user_message, ai_response,
                    intent_detected, confidence_score, response_time, personality_applied
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await dbpromise.execute(query, [
                userId,
                phone,
                conversationId,
                userMessage,
                aiResponse.message,
                aiResponse.intent,
                aiResponse.confidence,
                aiResponse.processingTime,
                JSON.stringify(aiResponse.personality)
            ]);
            
        } catch (error) {
            console.error("❌ Error logging conversation:", error);
        }
    }

    /**
     * Generate error response
     */
    generateErrorResponse(error) {
        return {
            message: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
            type: 'text',
            confidence: 0.0,
            intent: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create AI prompt with full context
     */
    async createAIPrompt(message, options = {}) {
        try {
            const { context, personality, knowledge, nlpAnalysis } = options;
            
            let prompt = `You are a helpful AI assistant for a WhatsApp business. `;
            
            // Add personality context
            if (personality) {
                prompt += `You have a ${personality.personalityType || 'friendly'} personality and use a ${personality.communicationStyle || 'casual'} communication style. `;
            }
            
            // Add business context
            if (knowledge && Object.keys(knowledge).length > 0) {
                prompt += `Here's current business information: ${JSON.stringify(knowledge)}. `;
            }
            
            // Add conversation history
            if (context && context.messageHistory && context.messageHistory.length > 0) {
                prompt += `Previous conversation: ${context.messageHistory.slice(-3).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}. `;
            }
            
            // Add NLP insights
            if (nlpAnalysis) {
                prompt += `The user's message shows ${nlpAnalysis.intent.name} intent with ${nlpAnalysis.emotion.name} emotion. `;
                if (nlpAnalysis.strategy) {
                    prompt += `Use ${nlpAnalysis.strategy.tone} tone and provide a ${nlpAnalysis.strategy.length} response. `;
                }
            }
            
            prompt += `User message: "${message}". Respond naturally and helpfully.`;
            
            return prompt;
        } catch (error) {
            console.error("❌ Error creating AI prompt:", error);
            return `User message: "${message}". Please respond helpfully.`;
        }
    }

    /**
     * Create system message for AI
     */
    createSystemMessage(personality, nlpAnalysis) {
        let systemMessage = "You are a professional WhatsApp business assistant.";
        
        if (personality) {
            systemMessage += ` You have a ${personality.personalityType || 'friendly'} personality.`;
        }
        
        if (nlpAnalysis?.strategy) {
            systemMessage += ` Use ${nlpAnalysis.strategy.tone} tone and be ${nlpAnalysis.strategy.personalityType}.`;
        }
        
        systemMessage += " Always be helpful, accurate, and maintain a conversational tone.";
        
        return systemMessage;
    }

    /**
     * Determine response length based on NLP analysis
     */
    determineResponseLength(nlpAnalysis) {
        if (!nlpAnalysis?.strategy) return 150;
        
        const lengthMap = {
            'short': 50,
            'balanced': 150,
            'detailed': 300,
            'comprehensive': 500
        };
        
        return lengthMap[nlpAnalysis.strategy.length] || 150;
    }

    /**
     * Determine response temperature based on NLP analysis
     */
    determineResponseTemperature(nlpAnalysis) {
        if (!nlpAnalysis?.emotion) return 0.7;
        
        const temperatureMap = {
            'excited': 0.9,
            'happy': 0.8,
            'neutral': 0.7,
            'sad': 0.6,
            'angry': 0.5,
            'worried': 0.6
        };
        
        return temperatureMap[nlpAnalysis.emotion.name] || 0.7;
    }

    /**
     * Apply final refinements to response
     */
    async applyFinalRefinements(response, nlpAnalysis, context) {
        try {
            let refined = response;
            
            // Add conversational elements
            if (nlpAnalysis?.strategy?.followUpNeeded) {
                refined += " Is there anything else I can help you with?";
            }
            
            // Add empathy for emotional states
            if (nlpAnalysis?.emotion?.name === 'sad' || nlpAnalysis?.emotion?.name === 'worried') {
                refined = "I understand this might be concerning. " + refined;
            }
            
            // Add enthusiasm for positive emotions
            if (nlpAnalysis?.emotion?.name === 'excited' || nlpAnalysis?.emotion?.name === 'happy') {
                refined = refined.replace(/\./g, '!');
            }
            
            // Ensure proper length
            if (refined.length > 500) {
                refined = refined.substring(0, 497) + "...";
            }
            
            return refined;
        } catch (error) {
            console.error("❌ Error applying final refinements:", error);
            return response;
        }
    }

    /**
     * Get fallback response when AI fails
     */
    getFallbackResponse(message, context) {
        const fallbacks = [
            "I'm here to help! Could you please rephrase your question?",
            "I understand you need assistance. Let me connect you with the right information.",
            "Thank you for your message. I'm processing your request and will respond shortly.",
            "I'm here to help with your inquiry. Could you provide a bit more detail?"
        ];
        
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        
        return {
            message: randomFallback,
            type: 'text',
            confidence: 0.5,
            intent: 'fallback',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Load AI configurations
     */
    async loadAIConfigurations() {
        // Load system-wide AI configurations
        console.log("📄 Loading AI configurations...");
    }

    /**
     * Initialize conversation memory
     */
    async initializeConversationMemory() {
        // Setup memory management
        console.log("🧠 Initializing conversation memory...");
    }

    /**
     * Setup real-time listeners
     */
    async setupRealTimeListeners() {
        // Setup Google Sheets and other real-time data listeners
        console.log("🔄 Setting up real-time listeners...");
    }
}

module.exports = new NaturalConversationEngine();
