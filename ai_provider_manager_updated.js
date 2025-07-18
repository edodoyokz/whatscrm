const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbpromise } = require("../database/dbpromise");

/**
 * AI Provider Manager - Updated untuk OpenAI Compatible API
 * Support untuk https://ai.sumopod.com dan provider lainnya
 */
class AIProviderManager {
    constructor() {
        this.openai = null;
        this.gemini = null;
        this.activeProvider = null;
        this.initialized = false;
        this.rateLimits = new Map();
        this.errorCounts = new Map();
        
        // OpenAI Compatible API Configuration
        this.openaiCompatible = {
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        };
    }

    /**
     * Initialize AI providers dengan OpenAI Compatible API
     */
    async initialize() {
        try {
            console.log("🤖 Initializing AI Provider Manager...");
            
            // Initialize OpenAI Compatible
            await this.initializeOpenAICompatible();
            
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
     * Initialize OpenAI Compatible API
     */
    async initializeOpenAICompatible() {
        try {
            const openaiKey = process.env.OPENAI_API_KEY;
            const baseURL = process.env.OPENAI_BASE_URL || 'https://ai.sumopod.com/v1';
            
            if (!openaiKey) {
                console.warn("⚠️ OpenAI API key not found in environment variables");
                return;
            }

            this.openai = new OpenAI({
                apiKey: openaiKey,
                baseURL: baseURL,
                timeout: 30000,
                maxRetries: 3
            });

            // Test OpenAI Compatible connection
            await this.testOpenAICompatible();
            console.log("✅ OpenAI Compatible initialized successfully");
        } catch (error) {
            console.error("❌ OpenAI Compatible initialization failed:", error);
            this.openai = null;
        }
    }

    /**
     * Test OpenAI Compatible connection
     */
    async testOpenAICompatible() {
        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 10
            });
            return response.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI Compatible test failed: ${error.message}`);
        }
    }

    /**
     * Generate response using OpenAI Compatible API
     */
    async generateOpenAICompatibleResponse(messages, options) {
        try {
            const response = await this.openai.chat.completions.create({
                model: options.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7,
                presence_penalty: options.presencePenalty || 0,
                frequency_penalty: options.frequencyPenalty || 0,
                top_p: options.topP || 1
            });

            return response.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI Compatible API error: ${error.message}`);
        }
    }

    /**
     * Generate response with fallback mechanism
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
     */
    async tryProvider(provider, messages, options) {
        try {
            if (!this.canUseProvider(provider)) {
                return null;
            }

            let response;
            
            if (provider === 'openai' && this.openai) {
                response = await this.generateOpenAICompatibleResponse(messages, options);
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

    // ... rest of methods remain the same ...
}

module.exports = new AIProviderManager();