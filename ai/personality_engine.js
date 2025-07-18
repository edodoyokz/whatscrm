const { dbpromise } = require("../database/dbpromise");

/**
 * Personality Engine - Manages AI personality and brand voice
 * Creates dynamic, brand-aligned responses with emotional intelligence
 */
class PersonalityEngine {
    constructor() {
        this.personalityCache = new Map();
        this.brandVoiceTemplates = new Map();
        this.emotionalStates = new Map();
        this.industryProfiles = new Map();
        this.initialized = false;
    }

    /**
     * Initialize personality engine
     */
    async initialize() {
        try {
            console.log("🎭 Initializing Personality Engine...");
            
            // Load personality templates
            await this.loadPersonalityTemplates();
            
            // Load industry profiles
            await this.loadIndustryProfiles();
            
            // Load brand voice templates
            await this.loadBrandVoiceTemplates();
            
            // Setup emotional intelligence
            await this.setupEmotionalIntelligence();
            
            this.initialized = true;
            console.log("✅ Personality Engine initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Personality Engine:", error);
            throw error;
        }
    }

    /**
     * Apply personality to AI response
     * @param {string} baseResponse - Base AI response
     * @param {Object} personality - User personality configuration
     * @param {Object} context - Conversation context
     * @returns {string} - Personality-enhanced response
     */
    async applyPersonality(baseResponse, personality, context = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Get personality configuration
            const personalityConfig = await this.getPersonalityConfig(personality);
            
            // Apply personality transformation
            let enhancedResponse = await this.transformResponse(baseResponse, personalityConfig, context);
            
            // Apply emotional tone
            enhancedResponse = await this.applyEmotionalTone(enhancedResponse, personalityConfig, context);
            
            // Apply industry-specific adjustments
            enhancedResponse = await this.applyIndustryStyle(enhancedResponse, personalityConfig);
            
            // Apply brand voice
            enhancedResponse = await this.applyBrandVoice(enhancedResponse, personalityConfig);
            
            return enhancedResponse;
        } catch (error) {
            console.error("❌ Error applying personality:", error);
            return baseResponse; // Fallback to original response
        }
    }

    /**
     * Get personality configuration for user
     */
    async getPersonalityConfig(personality) {
        try {
            const config = {
                type: personality.personalityType || 'friendly',
                style: personality.communicationStyle || 'casual',
                length: personality.responseLength || 'balanced',
                tone: personality.emotionalTone || 'empathetic',
                industry: personality.industryType || 'general',
                brandVoice: personality.brandVoiceSettings || {},
                customInstructions: personality.customInstructions || ''
            };

            return config;
        } catch (error) {
            console.error("❌ Error getting personality config:", error);
            return this.getDefaultPersonalityConfig();
        }
    }

    /**
     * Transform response based on personality type
     */
    async transformResponse(response, config, context) {
        try {
            const transformations = {
                professional: this.transformProfessional,
                friendly: this.transformFriendly,
                expert: this.transformExpert,
                caring: this.transformCaring,
                trendy: this.transformTrendy
            };

            const transformer = transformations[config.type];
            if (!transformer) {
                return response;
            }

            return await transformer.call(this, response, config, context);
        } catch (error) {
            console.error("❌ Error transforming response:", error);
            return response;
        }
    }

    /**
     * Transform to professional personality
     */
    async transformProfessional(response, config, context) {
        try {
            let transformed = response;

            // Add professional greetings
            if (this.isGreeting(response)) {
                transformed = this.addProfessionalGreeting(transformed);
            }

            // Use formal language
            transformed = this.formalizeLanguage(transformed);

            // Add professional closings
            if (this.isClosing(response)) {
                transformed = this.addProfessionalClosing(transformed);
            }

            return transformed;
        } catch (error) {
            return response;
        }
    }

    /**
     * Transform to friendly personality
     */
    async transformFriendly(response, config, context) {
        try {
            let transformed = response;

            // Add friendly greetings
            if (this.isGreeting(response)) {
                transformed = this.addFriendlyGreeting(transformed);
            }

            // Use casual language
            transformed = this.casualizeLanguage(transformed);

            // Add emojis appropriately
            transformed = this.addFriendlyEmojis(transformed);

            // Add friendly closings
            if (this.isClosing(response)) {
                transformed = this.addFriendlyClosing(transformed);
            }

            return transformed;
        } catch (error) {
            return response;
        }
    }

    /**
     * Transform to expert personality
     */
    async transformExpert(response, config, context) {
        try {
            let transformed = response;

            // Add expert knowledge indicators
            transformed = this.addExpertKnowledge(transformed);

            // Use technical language appropriately
            transformed = this.addTechnicalLanguage(transformed, config.industry);

            // Add credibility indicators
            transformed = this.addCredibilityIndicators(transformed);

            return transformed;
        } catch (error) {
            return response;
        }
    }

    /**
     * Transform to caring personality
     */
    async transformCaring(response, config, context) {
        try {
            let transformed = response;

            // Add empathetic language
            transformed = this.addEmpathyLanguage(transformed);

            // Add supportive phrases
            transformed = this.addSupportivePhrases(transformed);

            // Add caring closings
            if (this.isClosing(response)) {
                transformed = this.addCaringClosing(transformed);
            }

            return transformed;
        } catch (error) {
            return response;
        }
    }

    /**
     * Transform to trendy personality
     */
    async transformTrendy(response, config, context) {
        try {
            let transformed = response;

            // Add trendy language
            transformed = this.addTrendyLanguage(transformed);

            // Add contemporary expressions
            transformed = this.addContemporaryExpressions(transformed);

            // Add trendy emojis
            transformed = this.addTrendyEmojis(transformed);

            return transformed;
        } catch (error) {
            return response;
        }
    }

    /**
     * Apply emotional tone to response
     */
    async applyEmotionalTone(response, config, context) {
        try {
            const toneAdjustments = {
                enthusiastic: this.applyEnthusiasticTone,
                calm: this.applyCalmTone,
                empathetic: this.applyEmpatheticTone,
                confident: this.applyConfidentTone
            };

            const adjuster = toneAdjustments[config.tone];
            if (!adjuster) {
                return response;
            }

            return await adjuster.call(this, response, context);
        } catch (error) {
            console.error("❌ Error applying emotional tone:", error);
            return response;
        }
    }

    /**
     * Apply enthusiastic tone
     */
    async applyEnthusiasticTone(response, context) {
        try {
            let enhanced = response;

            // Add enthusiasm markers
            enhanced = enhanced.replace(/\./g, '!');
            enhanced = enhanced.replace(/good/gi, 'great');
            enhanced = enhanced.replace(/yes/gi, 'absolutely');

            // Add enthusiastic phrases
            const enthusiasticPhrases = [
                "That's fantastic!",
                "I'm excited to help!",
                "This is going to be great!",
                "Perfect!"
            ];

            if (Math.random() < 0.3) {
                enhanced = this.addRandomPhrase(enhanced, enthusiasticPhrases);
            }

            return enhanced;
        } catch (error) {
            return response;
        }
    }

    /**
     * Apply calm tone
     */
    async applyCalmTone(response, context) {
        try {
            let enhanced = response;

            // Add calming phrases
            const calmPhrases = [
                "Let me help you with that.",
                "No worries,",
                "I understand.",
                "Let's take this step by step."
            ];

            if (Math.random() < 0.3) {
                enhanced = this.addRandomPhrase(enhanced, calmPhrases);
            }

            return enhanced;
        } catch (error) {
            return response;
        }
    }

    /**
     * Apply empathetic tone
     */
    async applyEmpatheticTone(response, context) {
        try {
            let enhanced = response;

            // Add empathetic phrases
            const empatheticPhrases = [
                "I understand how you feel.",
                "That makes sense.",
                "I can help you with that.",
                "I'm here for you."
            ];

            if (Math.random() < 0.3) {
                enhanced = this.addRandomPhrase(enhanced, empatheticPhrases);
            }

            return enhanced;
        } catch (error) {
            return response;
        }
    }

    /**
     * Apply confident tone
     */
    async applyConfidentTone(response, context) {
        try {
            let enhanced = response;

            // Add confident phrases
            const confidentPhrases = [
                "I can definitely help with that.",
                "Here's exactly what you need:",
                "I've got the perfect solution:",
                "This is what I recommend:"
            ];

            if (Math.random() < 0.3) {
                enhanced = this.addRandomPhrase(enhanced, confidentPhrases);
            }

            return enhanced;
        } catch (error) {
            return response;
        }
    }

    /**
     * Apply industry-specific style
     */
    async applyIndustryStyle(response, config) {
        try {
            const industryStyles = {
                healthcare: this.applyHealthcareStyle,
                finance: this.applyFinanceStyle,
                retail: this.applyRetailStyle,
                hospitality: this.applyHospitalityStyle,
                technology: this.applyTechnologyStyle,
                education: this.applyEducationStyle
            };

            const styler = industryStyles[config.industry];
            if (!styler) {
                return response;
            }

            return await styler.call(this, response, config);
        } catch (error) {
            console.error("❌ Error applying industry style:", error);
            return response;
        }
    }

    /**
     * Apply brand voice
     */
    async applyBrandVoice(response, config) {
        try {
            const brandVoice = config.brandVoice;
            
            if (!brandVoice || Object.keys(brandVoice).length === 0) {
                return response;
            }

            let enhanced = response;

            // Apply custom instructions
            if (config.customInstructions) {
                enhanced = this.applyCustomInstructions(enhanced, config.customInstructions);
            }

            // Apply brand-specific terminology
            if (brandVoice.terminology) {
                enhanced = this.applyBrandTerminology(enhanced, brandVoice.terminology);
            }

            return enhanced;
        } catch (error) {
            console.error("❌ Error applying brand voice:", error);
            return response;
        }
    }

    // Helper methods for personality transformation

    isGreeting(response) {
        const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'welcome'];
        return greetingKeywords.some(keyword => response.toLowerCase().includes(keyword));
    }

    isClosing(response) {
        const closingKeywords = ['goodbye', 'bye', 'see you', 'have a great', 'thank you'];
        return closingKeywords.some(keyword => response.toLowerCase().includes(keyword));
    }

    addProfessionalGreeting(response) {
        const greetings = [
            "Good day,",
            "Thank you for contacting us.",
            "I'm pleased to assist you.",
            "How may I be of service?"
        ];
        return this.prependRandomPhrase(response, greetings);
    }

    addFriendlyGreeting(response) {
        const greetings = [
            "Hey there! 👋",
            "Hi! Great to hear from you!",
            "Hello! How's your day going?",
            "Hey! What can I help you with?"
        ];
        return this.prependRandomPhrase(response, greetings);
    }

    formalizeLanguage(response) {
        const substitutions = {
            "can't": "cannot",
            "won't": "will not",
            "don't": "do not",
            "isn't": "is not",
            "aren't": "are not",
            "hey": "hello",
            "yeah": "yes",
            "nope": "no"
        };

        let formal = response;
        Object.entries(substitutions).forEach(([informal, formal_word]) => {
            formal = formal.replace(new RegExp(informal, 'gi'), formal_word);
        });

        return formal;
    }

    casualizeLanguage(response) {
        const substitutions = {
            "cannot": "can't",
            "will not": "won't",
            "do not": "don't",
            "is not": "isn't",
            "are not": "aren't",
            "hello": "hey",
            "certainly": "sure",
            "absolutely": "totally"
        };

        let casual = response;
        Object.entries(substitutions).forEach(([formal, casual_word]) => {
            casual = casual.replace(new RegExp(formal, 'gi'), casual_word);
        });

        return casual;
    }

    addFriendlyEmojis(response) {
        const emojiMap = {
            'great': 'great 😊',
            'perfect': 'perfect ✨',
            'thank you': 'thank you 🙏',
            'welcome': 'welcome 🎉',
            'help': 'help 💪'
        };

        let enhanced = response;
        Object.entries(emojiMap).forEach(([word, replacement]) => {
            enhanced = enhanced.replace(new RegExp(word, 'gi'), replacement);
        });

        return enhanced;
    }

    addRandomPhrase(response, phrases) {
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        return `${randomPhrase} ${response}`;
    }

    prependRandomPhrase(response, phrases) {
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        return `${randomPhrase} ${response}`;
    }

    // Industry-specific style methods
    async applyHealthcareStyle(response, config) {
        // Add healthcare-specific language
        return response.replace(/problem/gi, 'concern')
                      .replace(/fix/gi, 'address')
                      .replace(/issue/gi, 'matter');
    }

    async applyRetailStyle(response, config) {
        // Add retail-specific language
        return response.replace(/item/gi, 'product')
                      .replace(/buy/gi, 'purchase')
                      .replace(/get/gi, 'receive');
    }

    async applyHospitalityStyle(response, config) {
        // Add hospitality-specific language
        return response.replace(/help/gi, 'serve')
                      .replace(/problem/gi, 'concern')
                      .replace(/good/gi, 'wonderful');
    }

    // Load methods
    async loadPersonalityTemplates() {
        // Load personality templates from database or config
        console.log("📚 Loading personality templates...");
    }

    async loadIndustryProfiles() {
        // Load industry-specific profiles
        console.log("🏢 Loading industry profiles...");
    }

    async loadBrandVoiceTemplates() {
        // Load brand voice templates
        console.log("🎨 Loading brand voice templates...");
    }

    async setupEmotionalIntelligence() {
        // Setup emotional intelligence patterns
        console.log("🧠 Setting up emotional intelligence...");
    }

    getDefaultPersonalityConfig() {
        return {
            type: 'friendly',
            style: 'casual',
            length: 'balanced',
            tone: 'empathetic',
            industry: 'general',
            brandVoice: {},
            customInstructions: ''
        };
    }

    applyCustomInstructions(response, instructions) {
        // Apply custom brand instructions
        return response;
    }

    applyBrandTerminology(response, terminology) {
        // Apply brand-specific terminology
        let enhanced = response;
        Object.entries(terminology).forEach(([generic, branded]) => {
            enhanced = enhanced.replace(new RegExp(generic, 'gi'), branded);
        });
        return enhanced;
    }
}

module.exports = new PersonalityEngine();
