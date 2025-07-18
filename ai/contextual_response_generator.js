const naturalLanguageProcessor = require('./natural_language_processor');
const aiProviderManager = require('./ai_provider_manager');
const contextManager = require('./context_manager');
const sheetsIntelligence = require('./sheets_intelligence');
const { dbpromise } = require("../database/dbpromise");

/**
 * Contextual Response Generator
 * Generates intelligent, context-aware responses with suggestions and recommendations
 */
class ContextualResponseGenerator {
    constructor() {
        this.responseTemplates = new Map();
        this.suggestionEngines = new Map();
        this.businessLogicRules = new Map();
        this.upsellStrategies = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the contextual response generator
     */
    async initialize() {
        try {
            console.log("🎯 Initializing Contextual Response Generator...");
            
            // Load response templates
            await this.loadResponseTemplates();
            
            // Setup suggestion engines
            await this.setupSuggestionEngines();
            
            // Load business logic rules
            await this.loadBusinessLogicRules();
            
            // Setup upsell strategies
            await this.setupUpsellStrategies();
            
            this.initialized = true;
            console.log("✅ Contextual Response Generator initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Contextual Response Generator:", error);
            throw error;
        }
    }

    /**
     * Generate contextual response with suggestions
     * @param {Object} request - The user request with context
     * @returns {Object} - Enhanced response with suggestions
     */
    async generateContextualResponse(request) {
        try {
            const { message, userId, context, nlpAnalysis, realTimeData } = request;
            
            console.log("🎯 Generating contextual response...");
            
            // Analyze query context
            const queryContext = await this.analyzeQueryContext(message, context, nlpAnalysis);
            
            // Generate base response
            const baseResponse = await this.generateBaseResponse(message, queryContext, realTimeData);
            
            // Generate alternatives and suggestions
            const alternatives = await this.generateAlternatives(queryContext, realTimeData);
            
            // Add proactive assistance
            const proactiveAssistance = await this.generateProactiveAssistance(queryContext, realTimeData);
            
            // Generate business recommendations
            const businessRecommendations = await this.generateBusinessRecommendations(queryContext, realTimeData);
            
            // Generate upsell opportunities
            const upsellOpportunities = await this.generateUpsellOpportunities(queryContext, realTimeData);
            
            // Combine all elements
            const enhancedResponse = await this.combineResponseElements({
                baseResponse,
                alternatives,
                proactiveAssistance,
                businessRecommendations,
                upsellOpportunities,
                queryContext
            });
            
            // Log contextual response
            await this.logContextualResponse(userId, enhancedResponse);
            
            return enhancedResponse;
        } catch (error) {
            console.error("❌ Contextual response generation failed:", error);
            return this.getFallbackResponse(request);
        }
    }

    /**
     * Analyze query context for better understanding
     */
    async analyzeQueryContext(message, context, nlpAnalysis) {
        try {
            const queryContext = {
                // Basic context
                message,
                intent: nlpAnalysis.intent,
                emotion: nlpAnalysis.emotion,
                entities: nlpAnalysis.entities,
                
                // Conversation context
                conversationStage: this.determineConversationStage(context),
                userJourney: this.analyzeUserJourney(context),
                previousRequests: this.analyzePreviousRequests(context),
                
                // Business context
                businessDomain: this.identifyBusinessDomain(nlpAnalysis.entities),
                urgencyLevel: this.assessUrgencyLevel(nlpAnalysis),
                commercialIntent: this.assessCommercialIntent(nlpAnalysis),
                
                // Temporal context
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                season: this.determineSeason(),
                
                // User preferences
                preferredStyle: context.userPreferences?.communicationStyle || 'balanced',
                previousPurchases: context.userHistory?.purchases || [],
                interests: context.userPreferences?.interests || []
            };
            
            return queryContext;
        } catch (error) {
            console.error("❌ Query context analysis failed:", error);
            return {};
        }
    }

    /**
     * Generate base response using AI
     */
    async generateBaseResponse(message, queryContext, realTimeData) {
        try {
            // Create enhanced prompt with context
            const prompt = this.createContextualPrompt(message, queryContext, realTimeData);
            
            // Generate response using AI
            const aiResponse = await aiProviderManager.generateResponse(prompt, queryContext, {
                maxTokens: 300,
                temperature: 0.7
            });
            
            return {
                content: aiResponse.content,
                confidence: aiResponse.success ? 0.9 : 0.6,
                provider: aiResponse.provider,
                contextUsed: true
            };
        } catch (error) {
            console.error("❌ Base response generation failed:", error);
            return {
                content: "I understand your request. Let me help you with that.",
                confidence: 0.5,
                provider: 'fallback',
                contextUsed: false
            };
        }
    }

    /**
     * Generate alternative suggestions
     */
    async generateAlternatives(queryContext, realTimeData) {
        try {
            const alternatives = [];
            
            // Product/service alternatives
            if (queryContext.businessDomain) {
                const domainAlternatives = await this.generateDomainAlternatives(queryContext, realTimeData);
                alternatives.push(...domainAlternatives);
            }
            
            // Price-based alternatives
            if (queryContext.commercialIntent) {
                const priceAlternatives = await this.generatePriceAlternatives(queryContext, realTimeData);
                alternatives.push(...priceAlternatives);
            }
            
            // Time-based alternatives
            if (queryContext.intent.name === 'booking') {
                const timeAlternatives = await this.generateTimeAlternatives(queryContext, realTimeData);
                alternatives.push(...timeAlternatives);
            }
            
            return alternatives.slice(0, 3); // Limit to 3 alternatives
        } catch (error) {
            console.error("❌ Alternative generation failed:", error);
            return [];
        }
    }

    /**
     * Generate proactive assistance
     */
    async generateProactiveAssistance(queryContext, realTimeData) {
        try {
            const assistance = [];
            
            // Anticipate next questions
            const nextQuestions = await this.anticipateNextQuestions(queryContext);
            if (nextQuestions.length > 0) {
                assistance.push({
                    type: 'anticipated_questions',
                    content: 'You might also want to know:',
                    items: nextQuestions
                });
            }
            
            // Provide relevant information
            const relevantInfo = await this.provideRelevantInformation(queryContext, realTimeData);
            if (relevantInfo.length > 0) {
                assistance.push({
                    type: 'relevant_information',
                    content: 'Here\'s some additional information that might help:',
                    items: relevantInfo
                });
            }
            
            // Suggest actions
            const suggestedActions = await this.suggestActions(queryContext);
            if (suggestedActions.length > 0) {
                assistance.push({
                    type: 'suggested_actions',
                    content: 'You can also:',
                    items: suggestedActions
                });
            }
            
            return assistance;
        } catch (error) {
            console.error("❌ Proactive assistance generation failed:", error);
            return [];
        }
    }

    /**
     * Generate business recommendations
     */
    async generateBusinessRecommendations(queryContext, realTimeData) {
        try {
            const recommendations = [];
            
            // Product recommendations
            if (queryContext.businessDomain === 'products') {
                const productRecs = await this.generateProductRecommendations(queryContext, realTimeData);
                recommendations.push(...productRecs);
            }
            
            // Service recommendations
            if (queryContext.businessDomain === 'services') {
                const serviceRecs = await this.generateServiceRecommendations(queryContext, realTimeData);
                recommendations.push(...serviceRecs);
            }
            
            // Bundle recommendations
            const bundleRecs = await this.generateBundleRecommendations(queryContext, realTimeData);
            recommendations.push(...bundleRecs);
            
            return recommendations.slice(0, 3); // Limit to 3 recommendations
        } catch (error) {
            console.error("❌ Business recommendations generation failed:", error);
            return [];
        }
    }

    /**
     * Generate upsell opportunities
     */
    async generateUpsellOpportunities(queryContext, realTimeData) {
        try {
            const opportunities = [];
            
            // Only generate upsells if commercial intent is detected
            if (!queryContext.commercialIntent) {
                return opportunities;
            }
            
            // Premium alternatives
            const premiumAlternatives = await this.generatePremiumAlternatives(queryContext, realTimeData);
            opportunities.push(...premiumAlternatives);
            
            // Add-on services
            const addOnServices = await this.generateAddOnServices(queryContext, realTimeData);
            opportunities.push(...addOnServices);
            
            // Volume discounts
            const volumeDiscounts = await this.generateVolumeDiscounts(queryContext, realTimeData);
            opportunities.push(...volumeDiscounts);
            
            return opportunities.slice(0, 2); // Limit to 2 upsell opportunities
        } catch (error) {
            console.error("❌ Upsell opportunity generation failed:", error);
            return [];
        }
    }

    /**
     * Combine all response elements into final response
     */
    async combineResponseElements(elements) {
        try {
            const {
                baseResponse,
                alternatives,
                proactiveAssistance,
                businessRecommendations,
                upsellOpportunities,
                queryContext
            } = elements;
            
            let combinedResponse = baseResponse.content;
            
            // Add alternatives if available
            if (alternatives.length > 0) {
                combinedResponse += '\n\n' + this.formatAlternatives(alternatives);
            }
            
            // Add proactive assistance
            if (proactiveAssistance.length > 0) {
                combinedResponse += '\n\n' + this.formatProactiveAssistance(proactiveAssistance);
            }
            
            // Add business recommendations
            if (businessRecommendations.length > 0) {
                combinedResponse += '\n\n' + this.formatBusinessRecommendations(businessRecommendations);
            }
            
            // Add upsell opportunities (carefully)
            if (upsellOpportunities.length > 0 && queryContext.commercialIntent) {
                combinedResponse += '\n\n' + this.formatUpsellOpportunities(upsellOpportunities);
            }
            
            return {
                content: combinedResponse,
                confidence: baseResponse.confidence,
                provider: baseResponse.provider,
                contextUsed: true,
                elements: {
                    baseResponse,
                    alternatives: alternatives.length,
                    proactiveAssistance: proactiveAssistance.length,
                    businessRecommendations: businessRecommendations.length,
                    upsellOpportunities: upsellOpportunities.length
                },
                metadata: {
                    queryContext,
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error("❌ Response combination failed:", error);
            return elements.baseResponse;
        }
    }

    // Helper methods for analysis

    determineConversationStage(context) {
        const messageCount = context.conversationHistory?.length || 0;
        if (messageCount === 0) return 'initial';
        if (messageCount < 3) return 'early';
        if (messageCount < 10) return 'middle';
        return 'advanced';
    }

    analyzeUserJourney(context) {
        const history = context.conversationHistory || [];
        const intents = history.map(msg => msg.intent).filter(Boolean);
        
        return {
            totalInteractions: history.length,
            uniqueIntents: [...new Set(intents)],
            journeyStage: this.determineJourneyStage(intents)
        };
    }

    determineJourneyStage(intents) {
        if (intents.includes('purchase') || intents.includes('booking')) return 'conversion';
        if (intents.includes('product_inquiry') || intents.includes('pricing')) return 'consideration';
        if (intents.includes('greeting') || intents.includes('general_inquiry')) return 'awareness';
        return 'unknown';
    }

    analyzePreviousRequests(context) {
        const history = context.conversationHistory || [];
        return {
            totalRequests: history.length,
            lastRequest: history[history.length - 1],
            commonTopics: this.extractCommonTopics(history)
        };
    }

    extractCommonTopics(history) {
        const topics = new Set();
        history.forEach(msg => {
            if (msg.entities) {
                msg.entities.forEach(entity => topics.add(entity));
            }
        });
        return Array.from(topics);
    }

    identifyBusinessDomain(entities) {
        const productKeywords = ['product', 'item', 'goods'];
        const serviceKeywords = ['service', 'booking', 'appointment'];
        const hospitalityKeywords = ['room', 'hotel', 'restaurant'];
        
        const entityString = JSON.stringify(entities).toLowerCase();
        
        if (productKeywords.some(keyword => entityString.includes(keyword))) return 'products';
        if (serviceKeywords.some(keyword => entityString.includes(keyword))) return 'services';
        if (hospitalityKeywords.some(keyword => entityString.includes(keyword))) return 'hospitality';
        
        return 'general';
    }

    assessUrgencyLevel(nlpAnalysis) {
        const urgencyKeywords = ['urgent', 'asap', 'immediately', 'emergency'];
        const message = nlpAnalysis.input.toLowerCase();
        
        if (urgencyKeywords.some(keyword => message.includes(keyword))) return 'high';
        if (message.includes('!')) return 'medium';
        return 'normal';
    }

    assessCommercialIntent(nlpAnalysis) {
        const commercialKeywords = ['buy', 'purchase', 'order', 'book', 'price', 'cost'];
        const message = nlpAnalysis.input.toLowerCase();
        
        return commercialKeywords.some(keyword => message.includes(keyword));
    }

    determineSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    // Helper methods for generation

    createContextualPrompt(message, queryContext, realTimeData) {
        let prompt = `You are a helpful business assistant. `;
        
        // Add context information
        if (queryContext.conversationStage !== 'initial') {
            prompt += `This is a ${queryContext.conversationStage} stage conversation. `;
        }
        
        if (queryContext.urgencyLevel === 'high') {
            prompt += `The user has an urgent request. `;
        }
        
        if (queryContext.commercialIntent) {
            prompt += `The user has commercial intent. `;
        }
        
        // Add real-time data context
        if (realTimeData && Object.keys(realTimeData).length > 0) {
            prompt += `Current business data: ${JSON.stringify(realTimeData)}. `;
        }
        
        prompt += `User message: "${message}". Respond helpfully and naturally.`;
        
        return prompt;
    }

    async generateDomainAlternatives(queryContext, realTimeData) {
        const alternatives = [];
        
        if (queryContext.businessDomain === 'products' && realTimeData.products) {
            const products = realTimeData.products.slice(0, 3);
            alternatives.push(...products.map(product => ({
                type: 'product_alternative',
                name: product.name,
                description: product.description,
                price: product.price
            })));
        }
        
        return alternatives;
    }

    async generatePriceAlternatives(queryContext, realTimeData) {
        const alternatives = [];
        
        // Budget-friendly alternatives
        alternatives.push({
            type: 'budget_alternative',
            name: 'Budget Option',
            description: 'A cost-effective alternative that meets your needs'
        });
        
        // Premium alternatives
        alternatives.push({
            type: 'premium_alternative',
            name: 'Premium Option',
            description: 'Enhanced features and better quality'
        });
        
        return alternatives;
    }

    async generateTimeAlternatives(queryContext, realTimeData) {
        const alternatives = [];
        const now = new Date();
        
        // Next available slot
        alternatives.push({
            type: 'time_alternative',
            time: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour later
            description: 'Next available slot'
        });
        
        // Tomorrow same time
        alternatives.push({
            type: 'time_alternative',
            time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            description: 'Tomorrow at the same time'
        });
        
        return alternatives;
    }

    async anticipateNextQuestions(queryContext) {
        const questions = [];
        
        if (queryContext.intent.name === 'product_inquiry') {
            questions.push('What is the price?');
            questions.push('Is it available?');
            questions.push('How can I order it?');
        }
        
        if (queryContext.intent.name === 'booking') {
            questions.push('What are the available times?');
            questions.push('What do I need to bring?');
            questions.push('Can I reschedule?');
        }
        
        return questions;
    }

    async provideRelevantInformation(queryContext, realTimeData) {
        const info = [];
        
        if (queryContext.businessDomain === 'products' && realTimeData.products) {
            info.push('All products come with a 30-day warranty');
            info.push('Free shipping on orders over $50');
        }
        
        if (queryContext.businessDomain === 'services') {
            info.push('We offer flexible scheduling options');
            info.push('All services include consultation');
        }
        
        return info;
    }

    async suggestActions(queryContext) {
        const actions = [];
        
        if (queryContext.commercialIntent) {
            actions.push('Schedule a consultation');
            actions.push('Request a quote');
            actions.push('View our catalog');
        }
        
        return actions;
    }

    async generateProductRecommendations(queryContext, realTimeData) {
        const recommendations = [];
        
        if (realTimeData.products) {
            const topProducts = realTimeData.products.slice(0, 2);
            recommendations.push(...topProducts.map(product => ({
                type: 'product_recommendation',
                name: product.name,
                reason: 'Popular choice',
                price: product.price
            })));
        }
        
        return recommendations;
    }

    async generateServiceRecommendations(queryContext, realTimeData) {
        const recommendations = [];
        
        if (realTimeData.services) {
            const topServices = realTimeData.services.slice(0, 2);
            recommendations.push(...topServices.map(service => ({
                type: 'service_recommendation',
                name: service.name,
                reason: 'Highly rated',
                duration: service.duration
            })));
        }
        
        return recommendations;
    }

    async generateBundleRecommendations(queryContext, realTimeData) {
        const recommendations = [];
        
        if (queryContext.commercialIntent) {
            recommendations.push({
                type: 'bundle_recommendation',
                name: 'Complete Package',
                description: 'Everything you need in one bundle',
                savings: '20% off'
            });
        }
        
        return recommendations;
    }

    async generatePremiumAlternatives(queryContext, realTimeData) {
        const alternatives = [];
        
        alternatives.push({
            type: 'premium_upsell',
            name: 'Premium Version',
            benefits: ['Enhanced features', 'Priority support', 'Extended warranty'],
            additionalCost: '30% more'
        });
        
        return alternatives;
    }

    async generateAddOnServices(queryContext, realTimeData) {
        const addOns = [];
        
        addOns.push({
            type: 'addon_service',
            name: 'Express Delivery',
            description: 'Get it delivered in 24 hours',
            price: '$5'
        });
        
        return addOns;
    }

    async generateVolumeDiscounts(queryContext, realTimeData) {
        const discounts = [];
        
        discounts.push({
            type: 'volume_discount',
            name: 'Buy 3 Get 1 Free',
            description: 'Special offer for bulk purchases',
            savings: '25% off'
        });
        
        return discounts;
    }

    // Formatting methods

    formatAlternatives(alternatives) {
        if (alternatives.length === 0) return '';
        
        let formatted = '**Alternative Options:**\n';
        alternatives.forEach((alt, index) => {
            formatted += `${index + 1}. ${alt.name}`;
            if (alt.description) formatted += ` - ${alt.description}`;
            if (alt.price) formatted += ` (${alt.price})`;
            formatted += '\n';
        });
        
        return formatted;
    }

    formatProactiveAssistance(assistance) {
        if (assistance.length === 0) return '';
        
        let formatted = '';
        assistance.forEach(assist => {
            formatted += `**${assist.content}**\n`;
            assist.items.forEach(item => {
                formatted += `• ${item}\n`;
            });
            formatted += '\n';
        });
        
        return formatted;
    }

    formatBusinessRecommendations(recommendations) {
        if (recommendations.length === 0) return '';
        
        let formatted = '**Recommended for You:**\n';
        recommendations.forEach((rec, index) => {
            formatted += `${index + 1}. ${rec.name}`;
            if (rec.reason) formatted += ` - ${rec.reason}`;
            if (rec.price) formatted += ` (${rec.price})`;
            formatted += '\n';
        });
        
        return formatted;
    }

    formatUpsellOpportunities(opportunities) {
        if (opportunities.length === 0) return '';
        
        let formatted = '**You might also be interested in:**\n';
        opportunities.forEach((opp, index) => {
            formatted += `${index + 1}. ${opp.name}`;
            if (opp.description) formatted += ` - ${opp.description}`;
            if (opp.savings) formatted += ` (Save ${opp.savings})`;
            formatted += '\n';
        });
        
        return formatted;
    }

    // Initialization methods

    async loadResponseTemplates() {
        console.log("📄 Loading response templates...");
        // Load from database or configuration
    }

    async setupSuggestionEngines() {
        console.log("🤖 Setting up suggestion engines...");
        // Setup AI-powered suggestion engines
    }

    async loadBusinessLogicRules() {
        console.log("📋 Loading business logic rules...");
        // Load business-specific rules
    }

    async setupUpsellStrategies() {
        console.log("💰 Setting up upsell strategies...");
        // Setup upselling strategies
    }

    async logContextualResponse(userId, response) {
        try {
            await dbpromise.query(
                `INSERT INTO ai_analytics (event_type, provider, response_time, success, metadata) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'contextual_response',
                    'contextual_generator',
                    new Date(),
                    true,
                    JSON.stringify({
                        userId,
                        elementsGenerated: response.elements,
                        contextUsed: response.contextUsed,
                        confidence: response.confidence
                    })
                ]
            );
        } catch (error) {
            console.error("❌ Failed to log contextual response:", error);
        }
    }

    getFallbackResponse(request) {
        return {
            content: "I understand your request. Let me help you with the best information I have available.",
            confidence: 0.5,
            provider: 'fallback',
            contextUsed: false,
            elements: {
                baseResponse: true,
                alternatives: 0,
                proactiveAssistance: 0,
                businessRecommendations: 0,
                upsellOpportunities: 0
            }
        };
    }
}

module.exports = new ContextualResponseGenerator();
