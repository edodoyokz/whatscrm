const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbpromise } = require("../database/dbpromise");

/**
 * AI Provider Manager - Handles OpenAI and Gemini API integrations
 * Provides natural language processing with fallback mechanisms
 */
class AIProviderManager {
    constructor() {
        this.openai = null;
        this.gemini = null;
        this.activeProvider = null;
        this.initialized = false;
        this.rateLimits = new Map();
        this.errorCounts = new Map();
    }

    /**
     * Initialize AI providers
     */
    async initialize() {
        try {
            console.log("🤖 Initializing AI Provider Manager...");
            
            // Initialize OpenAI
            await this.initializeOpenAI();
            
            // Initialize Gemini
            await this.initializeGemini();
            
            // Set active provider
            this.setActiveProvider();
            
            // Setup rate limiting
            this.setupRateLimiting();
            
            this.initialized = true;
            console.log(`✅ AI Provider Manager initialized with ${this.activeProvider} as primary`);
        } catch (error) {
            console.error("❌ Failed to initialize AI Provider Manager:", error);
            throw error;
        }
    }

    /**
     * Initialize OpenAI client
     */
    async initializeOpenAI() {
        try {
            const openaiKey = process.env.OPENAI_API_KEY;
            if (!openaiKey) {
                console.warn("⚠️ OpenAI API key not found in environment variables");
                return;
            }

            this.openai = new OpenAI({
                apiKey: openaiKey,
                timeout: 30000,
                maxRetries: 3
            });

            // Test OpenAI connection
            await this.testOpenAI();
            console.log("✅ OpenAI initialized successfully");
        } catch (error) {
            console.error("❌ OpenAI initialization failed:", error);
            this.openai = null;
        }
    }

    /**
     * Initialize Gemini client with proper error handling
     */
    async initializeGemini() {
        try {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) {
                console.warn("⚠️ Gemini API key not found in environment variables");
                this.gemini = null;
                return false;
            }

            this.gemini = new GoogleGenerativeAI(geminiKey);
            
            // Test Gemini connection
            await this.testGemini();
            console.log("✅ Gemini initialized successfully");
            return true;
        } catch (error) {
            console.error("❌ Gemini initialization failed:", error);
            this.gemini = null;
            // Log error for monitoring
            await this.logInitializationError('gemini', error);
            return false;
        }
    }

    /**
     * Test OpenAI connection
     */
    async testOpenAI() {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 10
            });
            return response.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI test failed: ${error.message}`);
        }
    }

    /**
     * Test Gemini connection
     */
    async testGemini() {
        try {
            const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello");
            return result.response.text();
        } catch (error) {
            throw new Error(`Gemini test failed: ${error.message}`);
        }
    }

    /**
     * Set active provider based on availability
     */
    setActiveProvider() {
        if (this.openai) {
            this.activeProvider = 'openai';
        } else if (this.gemini) {
            this.activeProvider = 'gemini';
        } else {
            this.activeProvider = null;
            console.warn("⚠️ No AI providers available");
        }
    }

    /**
     * Setup rate limiting for providers
     */
    setupRateLimiting() {
        this.rateLimits.set('openai', {
            requests: 0,
            windowStart: Date.now(),
            limit: 1000, // requests per hour
            window: 3600000 // 1 hour
        });

        this.rateLimits.set('gemini', {
            requests: 0,
            windowStart: Date.now(),
            limit: 1000, // requests per hour
            window: 3600000 // 1 hour
        });
    }

    /**
     * Generate AI response with fallback
     * @param {string} prompt - User message
     * @param {Object} context - Conversation context
     * @param {Object} options - Generation options
     * @returns {Object} - AI response with metadata
     */
    async generateResponse(prompt, context = {}, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Build conversation messages
            const messages = this.buildMessages(prompt, context, options);
            
            // Try primary provider
            let response = await this.tryProvider(this.activeProvider, messages, options);
            
            if (!response) {
                // Try fallback provider
                const fallbackProvider = this.activeProvider === 'openai' ? 'gemini' : 'openai';
                response = await this.tryProvider(fallbackProvider, messages, options);
            }

            if (!response) {
                throw new Error("All AI providers failed");
            }

            // Log successful response
            await this.logResponse(response);
            
            return response;
        } catch (error) {
            console.error("❌ AI generation failed:", error);
            return this.getFallbackResponse(prompt, context);
        }
    }

    /**
     * Try specific AI provider
     * @param {string} provider - Provider name
     * @param {Array} messages - Conversation messages
     * @param {Object} options - Generation options
     * @returns {Object|null} - Response or null if failed
     */
    async tryProvider(provider, messages, options) {
        try {
            if (!this.canUseProvider(provider)) {
                return null;
            }

            let response;
            
            if (provider === 'openai' && this.openai) {
                response = await this.generateOpenAIResponse(messages, options);
            } else if (provider === 'gemini' && this.gemini) {
                response = await this.generateGeminiResponse(messages, options);
            } else {
                return null;
            }

            // Update rate limits
            this.updateRateLimit(provider);
            
            return {
                content: response,
                provider: provider,
                timestamp: new Date().toISOString(),
                success: true
            };
        } catch (error) {
            console.error(`❌ ${provider} failed:`, error);
            this.incrementErrorCount(provider);
            return null;
        }
    }

    /**
     * Generate response using OpenAI
     */
    async generateOpenAIResponse(messages, options) {
        try {
            const response = await this.openai.chat.completions.create({
                model: options.model || "gpt-3.5-turbo",
                messages: messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7,
                presence_penalty: options.presencePenalty || 0,
                frequency_penalty: options.frequencyPenalty || 0,
                top_p: options.topP || 1
            });

            return response.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }

    /**
     * Generate response using Gemini
     */
    async generateGeminiResponse(messages, options) {
        try {
            const model = this.gemini.getGenerativeModel({ 
                model: options.model || "gemini-pro",
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 500,
                    topP: options.topP || 1,
                    topK: options.topK || 40
                }
            });

            // Convert messages to Gemini format
            const prompt = this.convertMessagesToGeminiFormat(messages);
            
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
    }

    /**
     * Build conversation messages
     */
    buildMessages(prompt, context, options) {
        const messages = [];

        // Add system message
        if (options.systemMessage) {
            messages.push({
                role: "system",
                content: options.systemMessage
            });
        }

        // Add conversation history
        if (context.conversationHistory) {
            context.conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        // Add current prompt
        messages.push({
            role: "user",
            content: prompt
        });

        return messages;
    }

    /**
     * Convert messages to Gemini format
     */
    convertMessagesToGeminiFormat(messages) {
        // Gemini uses a different format - combine all messages into a single prompt
        let prompt = "";
        
        messages.forEach(msg => {
            if (msg.role === 'system') {
                prompt += `Instructions: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                prompt += `Assistant: ${msg.content}\n`;
            }
        });

        return prompt;
    }

    /**
     * Check if provider can be used (rate limiting, error count)
     */
    canUseProvider(provider) {
        if (!provider) return false;
        
        const rateLimit = this.rateLimits.get(provider);
        if (!rateLimit) return false;

        // Check rate limit
        const now = Date.now();
        if (now - rateLimit.windowStart > rateLimit.window) {
            // Reset window
            rateLimit.requests = 0;
            rateLimit.windowStart = now;
        }

        if (rateLimit.requests >= rateLimit.limit) {
            return false;
        }

        // Check error count
        const errorCount = this.errorCounts.get(provider) || 0;
        if (errorCount > 5) {
            return false;
        }

        return true;
    }

    /**
     * Update rate limit for provider
     */
    updateRateLimit(provider) {
        const rateLimit = this.rateLimits.get(provider);
        if (rateLimit) {
            rateLimit.requests++;
        }
    }

    /**
     * Increment error count for provider
     */
    incrementErrorCount(provider) {
        const currentCount = this.errorCounts.get(provider) || 0;
        this.errorCounts.set(provider, currentCount + 1);
    }

    /**
     * Get fallback response when AI fails
     */
    getFallbackResponse(prompt, context) {
        const fallbackResponses = [
            "I'm sorry, I'm having trouble processing your request right now. Could you please try again?",
            "I apologize for the inconvenience. My AI system is temporarily unavailable. Please try again in a moment.",
            "I'm experiencing some technical difficulties. Let me try to help you in a different way.",
            "I'm sorry for the delay. Could you please rephrase your question?"
        ];

        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        
        return {
            content: randomResponse,
            provider: 'fallback',
            timestamp: new Date().toISOString(),
            success: false
        };
    }

    /**
     * Log successful response for analytics
     */
    async logResponse(response) {
        try {
            await dbpromise.query(
                `INSERT INTO ai_analytics (event_type, provider, response_time, success, metadata) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'ai_generation',
                    response.provider,
                    new Date(),
                    response.success,
                    JSON.stringify({
                        hasContent: !!response.content,
                        contentLength: response.content?.length || 0
                    })
                ]
            );
        } catch (error) {
            console.error("❌ Failed to log AI response:", error);
        }
    }

    /**
     * Get provider status
     */
    getProviderStatus() {
        return {
            openai: {
                available: !!this.openai,
                errors: this.errorCounts.get('openai') || 0,
                requests: this.rateLimits.get('openai')?.requests || 0
            },
            gemini: {
                available: !!this.gemini,
                errors: this.errorCounts.get('gemini') || 0,
                requests: this.rateLimits.get('gemini')?.requests || 0
            },
            activeProvider: this.activeProvider
        };
    }

    /**
     * Reset error counts (for recovery)
     */
    resetErrorCounts() {
        this.errorCounts.clear();
        console.log("🔄 AI provider error counts reset");
    }

    /**
     * Switch active provider
     */
    switchProvider(provider) {
        if (provider === 'openai' && this.openai) {
            this.activeProvider = 'openai';
        } else if (provider === 'gemini' && this.gemini) {
            this.activeProvider = 'gemini';
        } else {
            throw new Error(`Provider ${provider} not available`);
        }
        
        console.log(`🔄 Switched to ${this.activeProvider} provider`);
    }
}

module.exports = new AIProviderManager();
