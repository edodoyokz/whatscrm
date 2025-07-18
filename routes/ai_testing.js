const express = require('express');
const router = express.Router();
const naturalConversationEngine = require('../ai/natural_conversation_engine');
const aiProviderManager = require('../ai/ai_provider_manager');
const personalityEngine = require('../ai/personality_engine');
const naturalLanguageProcessor = require('../ai/natural_language_processor');
const contextManager = require('../ai/context_manager');

/**
 * AI Testing Routes - Phase 2
 * Test endpoints for natural language processing and personality features
 */

/**
 * Test full AI pipeline
 */
router.post('/test-pipeline', async (req, res) => {
    try {
        const { message, userId = 'test-user', personality, context } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log("🧪 Testing AI pipeline for message:", message);
        
        // Test full pipeline
        const result = await naturalConversationEngine.processMessage({
            userId,
            phone: '+1234567890',
            message,
            type: 'text',
            startTime: Date.now()
        });
        
        res.json({
            success: true,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Pipeline test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test OpenAI/Gemini providers
 */
router.post('/test-providers', async (req, res) => {
    try {
        const { message = "Hello, how are you?", provider } = req.body;
        
        console.log("🤖 Testing AI providers...");
        
        // Test current provider
        const result = await aiProviderManager.generateResponse(message, {}, {
            maxTokens: 100,
            temperature: 0.7
        });
        
        // Get provider status
        const status = aiProviderManager.getProviderStatus();
        
        res.json({
            success: true,
            result: result,
            status: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Provider test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test personality engine
 */
router.post('/test-personality', async (req, res) => {
    try {
        const { 
            message = "Hello, I need help with my order",
            personalityType = 'friendly',
            tone = 'empathetic',
            style = 'casual'
        } = req.body;
        
        console.log("🎭 Testing personality engine...");
        
        // Test personality application
        const personality = {
            personalityType,
            emotionalTone: tone,
            communicationStyle: style
        };
        
        const result = await personalityEngine.applyPersonality(message, personality, {});
        
        res.json({
            success: true,
            original: message,
            enhanced: result,
            personality: personality,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Personality test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test natural language processor
 */
router.post('/test-nlp', async (req, res) => {
    try {
        const { message = "I'm really excited about this new product!" } = req.body;
        
        console.log("🧠 Testing NLP processor...");
        
        // Test NLP analysis
        const result = await naturalLanguageProcessor.processInput(message, {});
        
        res.json({
            success: true,
            input: message,
            analysis: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ NLP test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test conversation context
 */
router.post('/test-context', async (req, res) => {
    try {
        const { userId = 'test-user', messages = [] } = req.body;
        
        console.log("💭 Testing conversation context...");
        
        // Add messages to context
        for (const msg of messages) {
            await contextManager.addMessageToMemory(userId, msg);
        }
        
        // Get context
        const context = await contextManager.getConversationContext(userId);
        
        res.json({
            success: true,
            userId: userId,
            context: context,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Context test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test conversation flow
 */
router.post('/test-conversation', async (req, res) => {
    try {
        const { 
            userId = 'test-user',
            messages = [
                "Hello, I need help",
                "I'm looking for a product",
                "What's the price?"
            ]
        } = req.body;
        
        console.log("💬 Testing conversation flow...");
        
        const results = [];
        
        // Process each message in sequence
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            
            const result = await naturalConversationEngine.processMessage({
                userId: userId,
                phone: '+1234567890',
                message: message,
                type: 'text',
                startTime: Date.now()
            });
            
            results.push({
                step: i + 1,
                userMessage: message,
                aiResponse: result.message,
                intent: result.intent,
                emotion: result.emotion,
                confidence: result.confidence
            });
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        res.json({
            success: true,
            conversation: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Conversation test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test emotion detection
 */
router.post('/test-emotion', async (req, res) => {
    try {
        const testMessages = [
            "I'm so excited about this!",
            "I'm disappointed with the service",
            "I'm worried about my order",
            "Thank you so much, you're amazing!",
            "This is frustrating, nothing works",
            "I'm neutral about this topic"
        ];
        
        console.log("😊 Testing emotion detection...");
        
        const results = [];
        
        for (const message of testMessages) {
            const analysis = await naturalLanguageProcessor.processInput(message, {});
            results.push({
                message: message,
                emotion: analysis.emotion,
                intent: analysis.intent,
                confidence: analysis.emotion.confidence
            });
        }
        
        res.json({
            success: true,
            emotionTests: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Emotion test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test intent recognition
 */
router.post('/test-intent', async (req, res) => {
    try {
        const testMessages = [
            "Hello, how are you?",
            "What products do you have?",
            "I want to book an appointment",
            "I have a complaint about my order",
            "Thank you for your help",
            "Goodbye, see you later",
            "I need help with something",
            "What's the price of this item?"
        ];
        
        console.log("🎯 Testing intent recognition...");
        
        const results = [];
        
        for (const message of testMessages) {
            const analysis = await naturalLanguageProcessor.processInput(message, {});
            results.push({
                message: message,
                intent: analysis.intent,
                confidence: analysis.intent.confidence,
                method: analysis.intent.method
            });
        }
        
        res.json({
            success: true,
            intentTests: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Intent test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test personality variations
 */
router.post('/test-personalities', async (req, res) => {
    try {
        const message = "I need help with my order";
        const personalities = [
            { type: 'professional', tone: 'formal' },
            { type: 'friendly', tone: 'casual' },
            { type: 'expert', tone: 'technical' },
            { type: 'caring', tone: 'empathetic' },
            { type: 'trendy', tone: 'enthusiastic' }
        ];
        
        console.log("🎭 Testing personality variations...");
        
        const results = [];
        
        for (const personality of personalities) {
            const enhanced = await personalityEngine.applyPersonality(message, {
                personalityType: personality.type,
                emotionalTone: personality.tone,
                communicationStyle: 'balanced'
            }, {});
            
            results.push({
                personality: personality,
                original: message,
                enhanced: enhanced
            });
        }
        
        res.json({
            success: true,
            personalityTests: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Personality variations test failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get AI system status
 */
router.get('/status', async (req, res) => {
    try {
        console.log("📊 Getting AI system status...");
        
        const status = {
            naturalConversationEngine: {
                initialized: naturalConversationEngine.initialized || false
            },
            aiProviderManager: aiProviderManager.getProviderStatus(),
            personalityEngine: {
                initialized: personalityEngine.initialized || false
            },
            naturalLanguageProcessor: {
                initialized: naturalLanguageProcessor.initialized || false
            },
            contextManager: {
                initialized: contextManager.initialized || false
            }
        };
        
        res.json({
            success: true,
            status: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Status check failed:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
