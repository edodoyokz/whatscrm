const aiProviderManager = require('./ai_provider_manager');
const personalityEngine = require('./personality_engine');
const { dbpromise } = require("../database/dbpromise");

/**
 * Natural Language Processor - Advanced NLP capabilities
 * Handles intent recognition, emotion detection, and context understanding
 */
class NaturalLanguageProcessor {
    constructor() {
        this.intentPatterns = new Map();
        this.emotionPatterns = new Map();
        this.contextKeywords = new Map();
        this.entityExtractors = new Map();
        this.initialized = false;
    }

    /**
     * Initialize NLP processor
     */
    async initialize() {
        try {
            console.log("🧠 Initializing Natural Language Processor...");
            
            // Load intent patterns
            await this.loadIntentPatterns();
            
            // Load emotion patterns
            await this.loadEmotionPatterns();
            
            // Load context keywords
            await this.loadContextKeywords();
            
            // Setup entity extractors
            await this.setupEntityExtractors();
            
            this.initialized = true;
            console.log("✅ Natural Language Processor initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize NLP Processor:", error);
            throw error;
        }
    }

    /**
     * Process natural language input
     * @param {string} input - User input text
     * @param {Object} context - Conversation context
     * @returns {Object} - Processed NLP results
     */
    async processInput(input, context = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log("🔍 Processing natural language input...");

            // Extract basic information
            const basicInfo = this.extractBasicInfo(input);
            
            // Detect intent
            const intent = await this.detectIntent(input, context);
            
            // Detect emotion
            const emotion = await this.detectEmotion(input, context);
            
            // Extract entities
            const entities = await this.extractEntities(input, context);
            
            // Analyze context
            const contextAnalysis = await this.analyzeContext(input, context);
            
            // Generate response strategy
            const strategy = await this.generateResponseStrategy(intent, emotion, entities, contextAnalysis);
            
            const result = {
                input: input,
                basicInfo: basicInfo,
                intent: intent,
                emotion: emotion,
                entities: entities,
                contextAnalysis: contextAnalysis,
                strategy: strategy,
                timestamp: new Date().toISOString()
            };

            // Log NLP analysis
            await this.logNLPAnalysis(result);
            
            return result;
        } catch (error) {
            console.error("❌ NLP processing failed:", error);
            return this.getFallbackAnalysis(input);
        }
    }

    /**
     * Extract basic information from input
     */
    extractBasicInfo(input) {
        return {
            length: input.length,
            wordCount: input.split(/\s+/).length,
            hasQuestion: /\?/.test(input),
            hasExclamation: /!/.test(input),
            hasNumbers: /\d/.test(input),
            hasEmail: /\S+@\S+\.\S+/.test(input),
            hasPhone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(input),
            hasUrl: /https?:\/\/\S+/.test(input),
            language: this.detectLanguage(input)
        };
    }

    /**
     * Detect intent from input
     */
    async detectIntent(input, context) {
        try {
            const inputLower = input.toLowerCase();
            
            // Rule-based intent detection
            const ruleBasedIntent = this.detectRuleBasedIntent(inputLower);
            
            // AI-based intent detection
            const aiBasedIntent = await this.detectAIBasedIntent(input, context);
            
            // Combine results
            const intent = this.combineIntentResults(ruleBasedIntent, aiBasedIntent);
            
            return intent;
        } catch (error) {
            console.error("❌ Intent detection failed:", error);
            return this.getDefaultIntent();
        }
    }

    /**
     * Rule-based intent detection
     */
    detectRuleBasedIntent(inputLower) {
        const intents = {
            greeting: {
                patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
                confidence: 0.9
            },
            question: {
                patterns: ['what', 'how', 'when', 'where', 'why', 'who', 'which'],
                confidence: 0.8
            },
            booking: {
                patterns: ['book', 'reserve', 'schedule', 'appointment', 'meeting'],
                confidence: 0.85
            },
            complaint: {
                patterns: ['problem', 'issue', 'wrong', 'error', 'complain', 'disappointed'],
                confidence: 0.8
            },
            appreciation: {
                patterns: ['thank', 'thanks', 'appreciate', 'grateful', 'awesome', 'great'],
                confidence: 0.85
            },
            goodbye: {
                patterns: ['bye', 'goodbye', 'see you', 'farewell', 'later'],
                confidence: 0.9
            },
            help: {
                patterns: ['help', 'assist', 'support', 'guide', 'explain'],
                confidence: 0.8
            },
            product_inquiry: {
                patterns: ['product', 'item', 'service', 'price', 'cost', 'available'],
                confidence: 0.75
            }
        };

        let bestIntent = null;
        let maxScore = 0;

        Object.entries(intents).forEach(([intentName, intentData]) => {
            const score = this.calculatePatternScore(inputLower, intentData.patterns);
            const finalScore = score * intentData.confidence;
            
            if (finalScore > maxScore) {
                maxScore = finalScore;
                bestIntent = {
                    name: intentName,
                    confidence: finalScore,
                    method: 'rule-based'
                };
            }
        });

        return bestIntent || this.getDefaultIntent();
    }

    /**
     * AI-based intent detection
     */
    async detectAIBasedIntent(input, context) {
        try {
            const prompt = `Analyze the following message and determine the user's intent. 
            Consider the context and return the most likely intent.
            
            Message: "${input}"
            Context: ${JSON.stringify(context)}
            
            Possible intents: greeting, question, booking, complaint, appreciation, goodbye, help, product_inquiry, general
            
            Respond with only the intent name and confidence score (0-1) in format: "intent:confidence"`;

            const response = await aiProviderManager.generateResponse(prompt, {}, {
                maxTokens: 50,
                temperature: 0.3
            });

            if (response.success) {
                const result = response.content.trim();
                const [intentName, confidenceStr] = result.split(':');
                const confidence = parseFloat(confidenceStr) || 0.5;
                
                return {
                    name: intentName?.trim() || 'general',
                    confidence: Math.min(confidence, 1.0),
                    method: 'ai-based'
                };
            }
        } catch (error) {
            console.error("❌ AI intent detection failed:", error);
        }
        
        return null;
    }

    /**
     * Detect emotion from input
     */
    async detectEmotion(input, context) {
        try {
            const inputLower = input.toLowerCase();
            
            // Rule-based emotion detection
            const ruleBasedEmotion = this.detectRuleBasedEmotion(inputLower);
            
            // AI-based emotion detection
            const aiBasedEmotion = await this.detectAIBasedEmotion(input, context);
            
            // Combine results
            const emotion = this.combineEmotionResults(ruleBasedEmotion, aiBasedEmotion);
            
            return emotion;
        } catch (error) {
            console.error("❌ Emotion detection failed:", error);
            return this.getDefaultEmotion();
        }
    }

    /**
     * Rule-based emotion detection
     */
    detectRuleBasedEmotion(inputLower) {
        const emotions = {
            happy: {
                patterns: ['happy', 'great', 'awesome', 'wonderful', 'excellent', 'fantastic', 'love'],
                confidence: 0.8
            },
            sad: {
                patterns: ['sad', 'disappointed', 'upset', 'unhappy', 'depressed', 'down'],
                confidence: 0.8
            },
            angry: {
                patterns: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'frustrated'],
                confidence: 0.85
            },
            excited: {
                patterns: ['excited', 'thrilled', 'amazing', 'incredible', 'wow', 'fantastic'],
                confidence: 0.8
            },
            worried: {
                patterns: ['worried', 'concerned', 'nervous', 'anxious', 'scared', 'afraid'],
                confidence: 0.8
            },
            neutral: {
                patterns: ['okay', 'fine', 'alright', 'sure', 'yes', 'no'],
                confidence: 0.6
            }
        };

        let bestEmotion = null;
        let maxScore = 0;

        Object.entries(emotions).forEach(([emotionName, emotionData]) => {
            const score = this.calculatePatternScore(inputLower, emotionData.patterns);
            const finalScore = score * emotionData.confidence;
            
            if (finalScore > maxScore) {
                maxScore = finalScore;
                bestEmotion = {
                    name: emotionName,
                    confidence: finalScore,
                    intensity: this.calculateEmotionIntensity(inputLower, emotionData.patterns),
                    method: 'rule-based'
                };
            }
        });

        return bestEmotion || this.getDefaultEmotion();
    }

    /**
     * AI-based emotion detection
     */
    async detectAIBasedEmotion(input, context) {
        try {
            const prompt = `Analyze the emotional tone of the following message. 
            Consider the context and return the primary emotion.
            
            Message: "${input}"
            Context: ${JSON.stringify(context)}
            
            Possible emotions: happy, sad, angry, excited, worried, neutral, frustrated, grateful, confused
            
            Respond with emotion name, confidence (0-1), and intensity (low/medium/high) in format: "emotion:confidence:intensity"`;

            const response = await aiProviderManager.generateResponse(prompt, {}, {
                maxTokens: 50,
                temperature: 0.3
            });

            if (response.success) {
                const result = response.content.trim();
                const [emotionName, confidenceStr, intensity] = result.split(':');
                const confidence = parseFloat(confidenceStr) || 0.5;
                
                return {
                    name: emotionName?.trim() || 'neutral',
                    confidence: Math.min(confidence, 1.0),
                    intensity: intensity?.trim() || 'medium',
                    method: 'ai-based'
                };
            }
        } catch (error) {
            console.error("❌ AI emotion detection failed:", error);
        }
        
        return null;
    }

    /**
     * Extract entities from input
     */
    async extractEntities(input, context) {
        try {
            const entities = {
                names: this.extractNames(input),
                dates: this.extractDates(input),
                times: this.extractTimes(input),
                numbers: this.extractNumbers(input),
                emails: this.extractEmails(input),
                phones: this.extractPhones(input),
                locations: this.extractLocations(input),
                products: await this.extractProducts(input),
                services: await this.extractServices(input)
            };

            return entities;
        } catch (error) {
            console.error("❌ Entity extraction failed:", error);
            return {};
        }
    }

    /**
     * Analyze context for better understanding
     */
    async analyzeContext(input, context) {
        try {
            const analysis = {
                conversationFlow: this.analyzeConversationFlow(context),
                topicContinuity: this.analyzeTopicContinuity(input, context),
                urgency: this.analyzeUrgency(input),
                complexity: this.analyzeComplexity(input),
                personalityHints: this.analyzePersonalityHints(input),
                businessContext: await this.analyzeBusinessContext(input, context)
            };

            return analysis;
        } catch (error) {
            console.error("❌ Context analysis failed:", error);
            return {};
        }
    }

    /**
     * Generate response strategy based on analysis
     */
    async generateResponseStrategy(intent, emotion, entities, contextAnalysis) {
        try {
            const strategy = {
                responseType: this.determineResponseType(intent, emotion),
                tone: this.determineTone(emotion, contextAnalysis),
                length: this.determineLength(intent, contextAnalysis),
                personalityType: this.determinePersonalityType(emotion, contextAnalysis),
                urgency: contextAnalysis.urgency || 'normal',
                includeEntities: Object.keys(entities).length > 0,
                followUpNeeded: this.determineFollowUpNeeded(intent, contextAnalysis)
            };

            return strategy;
        } catch (error) {
            console.error("❌ Strategy generation failed:", error);
            return this.getDefaultStrategy();
        }
    }

    // Helper methods

    detectLanguage(input) {
        // Simple language detection
        const indonesianWords = ['saya', 'anda', 'dengan', 'untuk', 'dari', 'ini', 'itu', 'dan', 'atau', 'tidak'];
        const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
        
        const inputLower = input.toLowerCase();
        const indonesianCount = indonesianWords.filter(word => inputLower.includes(word)).length;
        const englishCount = englishWords.filter(word => inputLower.includes(word)).length;
        
        if (indonesianCount > englishCount) {
            return 'id';
        } else if (englishCount > indonesianCount) {
            return 'en';
        } else {
            return 'unknown';
        }
    }

    calculatePatternScore(input, patterns) {
        let score = 0;
        patterns.forEach(pattern => {
            if (input.includes(pattern)) {
                score += 1;
            }
        });
        return score / patterns.length;
    }

    calculateEmotionIntensity(input, patterns) {
        const intensityMarkers = ['very', 'extremely', 'really', 'so', 'totally', 'completely'];
        const hasIntensityMarker = intensityMarkers.some(marker => input.includes(marker));
        
        if (hasIntensityMarker) {
            return 'high';
        } else if (input.includes('!')) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    extractNames(input) {
        // Simple name extraction - can be enhanced
        const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
        return input.match(namePattern) || [];
    }

    extractDates(input) {
        const datePatterns = [
            /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,
            /\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4}/gi,
            /(today|tomorrow|yesterday|next week|this week|next month)/gi
        ];
        
        let dates = [];
        datePatterns.forEach(pattern => {
            const matches = input.match(pattern);
            if (matches) {
                dates.push(...matches);
            }
        });
        
        return dates;
    }

    extractTimes(input) {
        const timePattern = /\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi;
        return input.match(timePattern) || [];
    }

    extractNumbers(input) {
        const numberPattern = /\d+/g;
        return input.match(numberPattern) || [];
    }

    extractEmails(input) {
        const emailPattern = /\S+@\S+\.\S+/g;
        return input.match(emailPattern) || [];
    }

    extractPhones(input) {
        const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        return input.match(phonePattern) || [];
    }

    extractLocations(input) {
        // Simple location extraction - can be enhanced with database lookup
        const locationKeywords = ['jakarta', 'bandung', 'surabaya', 'medan', 'office', 'store', 'mall', 'hotel'];
        return locationKeywords.filter(loc => input.toLowerCase().includes(loc));
    }

    async extractProducts(input) {
        // Extract product mentions - can be enhanced with database lookup
        const productKeywords = ['product', 'item', 'service', 'package', 'plan'];
        return productKeywords.filter(prod => input.toLowerCase().includes(prod));
    }

    async extractServices(input) {
        // Extract service mentions - can be enhanced with database lookup
        const serviceKeywords = ['service', 'support', 'help', 'consultation', 'booking'];
        return serviceKeywords.filter(serv => input.toLowerCase().includes(serv));
    }

    // Analysis methods

    analyzeConversationFlow(context) {
        const messageCount = context.conversationHistory?.length || 0;
        if (messageCount === 0) return 'new';
        if (messageCount < 3) return 'beginning';
        if (messageCount < 10) return 'developing';
        return 'established';
    }

    analyzeTopicContinuity(input, context) {
        // Simple topic continuity check
        if (!context.conversationHistory || context.conversationHistory.length === 0) {
            return 'new_topic';
        }
        
        const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
        const commonWords = this.findCommonWords(input, lastMessage.content);
        
        if (commonWords.length > 2) {
            return 'continuing';
        } else {
            return 'new_topic';
        }
    }

    analyzeUrgency(input) {
        const urgencyMarkers = ['urgent', 'emergency', 'asap', 'immediately', 'help', 'problem'];
        const hasUrgencyMarker = urgencyMarkers.some(marker => input.toLowerCase().includes(marker));
        
        if (hasUrgencyMarker) {
            return 'high';
        } else if (input.includes('!')) {
            return 'medium';
        } else {
            return 'normal';
        }
    }

    analyzeComplexity(input) {
        const wordCount = input.split(/\s+/).length;
        const questionCount = (input.match(/\?/g) || []).length;
        const hasMultipleTopics = input.includes('and') || input.includes('also');
        
        if (wordCount > 50 || questionCount > 2 || hasMultipleTopics) {
            return 'high';
        } else if (wordCount > 20 || questionCount > 1) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    analyzePersonalityHints(input) {
        const hints = {
            formal: ['please', 'thank you', 'could you', 'would you'],
            casual: ['hey', 'hi', 'cool', 'awesome', 'yeah'],
            technical: ['system', 'process', 'configure', 'settings'],
            emotional: ['feel', 'love', 'hate', 'excited', 'disappointed']
        };
        
        const detected = [];
        Object.entries(hints).forEach(([type, markers]) => {
            if (markers.some(marker => input.toLowerCase().includes(marker))) {
                detected.push(type);
            }
        });
        
        return detected;
    }

    async analyzeBusinessContext(input, context) {
        // Analyze business-specific context
        return {
            isBusinessInquiry: this.isBusinessInquiry(input),
            requiresEscalation: this.requiresEscalation(input),
            hasCommercialIntent: this.hasCommercialIntent(input)
        };
    }

    // Strategy determination methods

    determineResponseType(intent, emotion) {
        if (intent.name === 'greeting') return 'greeting';
        if (intent.name === 'question') return 'informational';
        if (intent.name === 'complaint') return 'supportive';
        if (intent.name === 'appreciation') return 'acknowledgment';
        if (emotion.name === 'angry') return 'calming';
        if (emotion.name === 'sad') return 'empathetic';
        return 'conversational';
    }

    determineTone(emotion, contextAnalysis) {
        if (emotion.name === 'angry') return 'calm';
        if (emotion.name === 'sad') return 'empathetic';
        if (emotion.name === 'excited') return 'enthusiastic';
        if (contextAnalysis.urgency === 'high') return 'urgent';
        return 'friendly';
    }

    determineLength(intent, contextAnalysis) {
        if (contextAnalysis.complexity === 'high') return 'detailed';
        if (intent.name === 'greeting') return 'short';
        if (intent.name === 'question') return 'comprehensive';
        return 'balanced';
    }

    determinePersonalityType(emotion, contextAnalysis) {
        if (contextAnalysis.personalityHints.includes('formal')) return 'professional';
        if (contextAnalysis.personalityHints.includes('casual')) return 'friendly';
        if (contextAnalysis.personalityHints.includes('technical')) return 'expert';
        if (emotion.name === 'sad' || emotion.name === 'worried') return 'caring';
        return 'friendly';
    }

    determineFollowUpNeeded(intent, contextAnalysis) {
        if (intent.name === 'question' && contextAnalysis.complexity === 'high') return true;
        if (intent.name === 'complaint') return true;
        if (contextAnalysis.urgency === 'high') return true;
        return false;
    }

    // Helper methods

    findCommonWords(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        return words1.filter(word => words2.includes(word) && word.length > 3);
    }

    isBusinessInquiry(input) {
        const businessKeywords = ['price', 'cost', 'buy', 'purchase', 'order', 'booking', 'service'];
        return businessKeywords.some(keyword => input.toLowerCase().includes(keyword));
    }

    requiresEscalation(input) {
        const escalationKeywords = ['manager', 'supervisor', 'complaint', 'refund', 'cancel'];
        return escalationKeywords.some(keyword => input.toLowerCase().includes(keyword));
    }

    hasCommercialIntent(input) {
        const commercialKeywords = ['buy', 'purchase', 'order', 'payment', 'price', 'cost'];
        return commercialKeywords.some(keyword => input.toLowerCase().includes(keyword));
    }

    // Fallback methods

    getFallbackAnalysis(input) {
        return {
            input: input,
            basicInfo: this.extractBasicInfo(input),
            intent: this.getDefaultIntent(),
            emotion: this.getDefaultEmotion(),
            entities: {},
            contextAnalysis: {},
            strategy: this.getDefaultStrategy(),
            timestamp: new Date().toISOString()
        };
    }

    getDefaultIntent() {
        return {
            name: 'general',
            confidence: 0.5,
            method: 'default'
        };
    }

    getDefaultEmotion() {
        return {
            name: 'neutral',
            confidence: 0.5,
            intensity: 'medium',
            method: 'default'
        };
    }

    getDefaultStrategy() {
        return {
            responseType: 'conversational',
            tone: 'friendly',
            length: 'balanced',
            personalityType: 'friendly',
            urgency: 'normal',
            includeEntities: false,
            followUpNeeded: false
        };
    }

    // Initialization methods

    async loadIntentPatterns() {
        console.log("📋 Loading intent patterns...");
        // Load from database or config file
    }

    async loadEmotionPatterns() {
        console.log("😊 Loading emotion patterns...");
        // Load from database or config file
    }

    async loadContextKeywords() {
        console.log("🔑 Loading context keywords...");
        // Load from database or config file
    }

    async setupEntityExtractors() {
        console.log("🏷️ Setting up entity extractors...");
        // Setup entity extraction rules
    }

    async logNLPAnalysis(result) {
        try {
            await dbpromise.query(
                `INSERT INTO ai_analytics (event_type, provider, response_time, success, metadata) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'nlp_analysis',
                    'nlp_processor',
                    new Date(),
                    true,
                    JSON.stringify({
                        intent: result.intent.name,
                        emotion: result.emotion.name,
                        entityCount: Object.keys(result.entities).length,
                        language: result.basicInfo.language
                    })
                ]
            );
        } catch (error) {
            console.error("❌ Failed to log NLP analysis:", error);
        }
    }

    // Combine results methods

    combineIntentResults(ruleBasedIntent, aiBasedIntent) {
        if (!aiBasedIntent) return ruleBasedIntent;
        if (!ruleBasedIntent) return aiBasedIntent;
        
        // Use AI result if confidence is high, otherwise use rule-based
        if (aiBasedIntent.confidence > 0.7) {
            return aiBasedIntent;
        } else {
            return ruleBasedIntent;
        }
    }

    combineEmotionResults(ruleBasedEmotion, aiBasedEmotion) {
        if (!aiBasedEmotion) return ruleBasedEmotion;
        if (!ruleBasedEmotion) return aiBasedEmotion;
        
        // Use AI result if confidence is high, otherwise use rule-based
        if (aiBasedEmotion.confidence > 0.7) {
            return aiBasedEmotion;
        } else {
            return ruleBasedEmotion;
        }
    }
}

module.exports = new NaturalLanguageProcessor();
