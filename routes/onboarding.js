const express = require("express");
const router = express.Router();
const { dbpromise } = require("../database/dbpromise");
const user = require("../middlewares/user");

// AI Components for Onboarding
const personalityEngine = require("../ai/personality_engine");
const sheetsIntelligence = require("../ai/sheets_intelligence");
const contextManager = require("../ai/context_manager");
const naturalConversationEngine = require("../ai/natural_conversation_engine");

/**
 * Onboarding Revolution System
 * Streamlined onboarding with business type selection, personality questionnaire,
 * and Google Sheets auto-setup
 */

/**
 * @route GET /api/onboarding/start
 * @description Initialize onboarding process
 * @access Private
 */
router.get("/start", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🚀 Starting onboarding process for user ${uid}`);
    
    // Check if user has already completed onboarding
    const onboardingStatus = await getOnboardingStatus(uid);
    
    if (onboardingStatus.completed) {
      return res.json({
        success: true,
        data: {
          alreadyCompleted: true,
          completedAt: onboardingStatus.completedAt,
          currentStep: 'completed'
        },
        message: "Onboarding already completed"
      });
    }
    
    // Initialize onboarding session
    const onboardingSession = await initializeOnboardingSession(uid);
    
    // Get business type options
    const businessTypes = await getBusinessTypeOptions();
    
    // Get initial questionnaire
    const initialQuestionnaire = await getInitialQuestionnaire();
    
    const onboardingData = {
      sessionId: onboardingSession.sessionId,
      currentStep: 'business_type_selection',
      businessTypes,
      initialQuestionnaire,
      progress: {
        currentStep: 1,
        totalSteps: 5,
        percentage: 20
      }
    };
    
    res.json({
      success: true,
      data: onboardingData,
      message: "Onboarding process initialized successfully"
    });
    
  } catch (error) {
    console.error("❌ Error starting onboarding process:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to start onboarding process"
    });
  }
});

/**
 * @route POST /api/onboarding/business-type
 * @description Select business type
 * @access Private
 */
router.post("/business-type", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { businessType, businessDescription, sessionId } = req.body;
    
    console.log(`🏢 Setting business type for user ${uid}: ${businessType}`);
    
    // Validate session
    const session = await validateOnboardingSession(sessionId, uid);
    if (!session.isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
        message: "Onboarding session validation failed"
      });
    }
    
    // Save business type selection
    await saveBusinessTypeSelection(uid, businessType, businessDescription);
    
    // Generate personalized personality questionnaire based on business type
    const personalityQuestionnaire = await generatePersonalityQuestionnaire(businessType);
    
    // Update onboarding progress
    await updateOnboardingProgress(uid, 'personality_questionnaire', 2);
    
    res.json({
      success: true,
      data: {
        businessType,
        personalityQuestionnaire,
        nextStep: 'personality_questionnaire',
        progress: {
          currentStep: 2,
          totalSteps: 5,
          percentage: 40
        }
      },
      message: "Business type selected successfully"
    });
    
  } catch (error) {
    console.error("❌ Error selecting business type:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to select business type"
    });
  }
});

/**
 * @route POST /api/onboarding/personality-questionnaire
 * @description Complete personality questionnaire
 * @access Private
 */
router.post("/personality-questionnaire", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { answers, sessionId } = req.body;
    
    console.log(`🎭 Processing personality questionnaire for user ${uid}`);
    
    // Validate session
    const session = await validateOnboardingSession(sessionId, uid);
    if (!session.isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
        message: "Onboarding session validation failed"
      });
    }
    
    // Analyze personality based on answers
    const personalityAnalysis = await analyzePersonalityAnswers(answers, uid);
    
    // Generate recommended personality configuration
    const recommendedPersonality = await generateRecommendedPersonality(personalityAnalysis, uid);
    
    // Save personality configuration
    await personalityEngine.updateUserPersonality(uid, recommendedPersonality);
    
    // Get Google Sheets setup options
    const sheetsSetupOptions = await getSheetsSetupOptions();
    
    // Update onboarding progress
    await updateOnboardingProgress(uid, 'sheets_setup', 3);
    
    res.json({
      success: true,
      data: {
        personalityAnalysis,
        recommendedPersonality,
        sheetsSetupOptions,
        nextStep: 'sheets_setup',
        progress: {
          currentStep: 3,
          totalSteps: 5,
          percentage: 60
        }
      },
      message: "Personality questionnaire completed successfully"
    });
    
  } catch (error) {
    console.error("❌ Error processing personality questionnaire:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to process personality questionnaire"
    });
  }
});

/**
 * @route POST /api/onboarding/sheets-setup
 * @description Auto-setup Google Sheets
 * @access Private
 */
router.post("/sheets-setup", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { setupType, sheetUrl, templateType, sessionId } = req.body;
    
    console.log(`📊 Setting up Google Sheets for user ${uid}: ${setupType}`);
    
    // Validate session
    const session = await validateOnboardingSession(sessionId, uid);
    if (!session.isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
        message: "Onboarding session validation failed"
      });
    }
    
    let setupResult;
    
    switch (setupType) {
      case 'existing_sheet':
        setupResult = await setupExistingSheet(uid, sheetUrl);
        break;
      case 'template':
        setupResult = await setupFromTemplate(uid, templateType);
        break;
      case 'manual':
        setupResult = await setupManualSheet(uid);
        break;
      default:
        throw new Error(`Unknown setup type: ${setupType}`);
    }
    
    // Test sheet connection
    const connectionTest = await testSheetConnection(uid, setupResult.sheetId);
    
    // Generate sample conversation data
    const sampleConversations = await generateSampleConversations(uid);
    
    // Update onboarding progress
    await updateOnboardingProgress(uid, 'conversation_testing', 4);
    
    res.json({
      success: true,
      data: {
        setupResult,
        connectionTest,
        sampleConversations,
        nextStep: 'conversation_testing',
        progress: {
          currentStep: 4,
          totalSteps: 5,
          percentage: 80
        }
      },
      message: "Google Sheets setup completed successfully"
    });
    
  } catch (error) {
    console.error("❌ Error setting up Google Sheets:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to setup Google Sheets"
    });
  }
});

/**
 * @route POST /api/onboarding/conversation-testing
 * @description Test sample conversations
 * @access Private
 */
router.post("/conversation-testing", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { selectedSamples, sessionId } = req.body;
    
    console.log(`💬 Testing sample conversations for user ${uid}`);
    
    // Validate session
    const session = await validateOnboardingSession(sessionId, uid);
    if (!session.isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
        message: "Onboarding session validation failed"
      });
    }
    
    // Test conversations with AI
    const testResults = await testSampleConversations(uid, selectedSamples);
    
    // Analyze conversation quality
    const qualityAnalysis = await analyzeConversationQuality(testResults);
    
    // Generate improvement suggestions
    const improvementSuggestions = await generateImprovementSuggestions(qualityAnalysis);
    
    // Prepare final activation
    const activationData = await prepareActivation(uid);
    
    // Update onboarding progress
    await updateOnboardingProgress(uid, 'activation', 5);
    
    res.json({
      success: true,
      data: {
        testResults,
        qualityAnalysis,
        improvementSuggestions,
        activationData,
        nextStep: 'activation',
        progress: {
          currentStep: 5,
          totalSteps: 5,
          percentage: 100
        }
      },
      message: "Conversation testing completed successfully"
    });
    
  } catch (error) {
    console.error("❌ Error testing conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to test conversations"
    });
  }
});

/**
 * @route POST /api/onboarding/activate
 * @description Complete onboarding and activate system
 * @access Private
 */
router.post("/activate", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { sessionId, finalConfirmation } = req.body;
    
    console.log(`🎉 Activating system for user ${uid}`);
    
    // Validate session
    const session = await validateOnboardingSession(sessionId, uid);
    if (!session.isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
        message: "Onboarding session validation failed"
      });
    }
    
    if (!finalConfirmation) {
      return res.status(400).json({
        success: false,
        error: "Final confirmation required",
        message: "User must confirm activation"
      });
    }
    
    // Activate AI system
    const activationResult = await activateAISystem(uid);
    
    // Complete onboarding
    await completeOnboarding(uid, sessionId);
    
    // Initialize real-time features
    await initializeRealTimeFeatures(uid);
    
    // Send welcome message
    const welcomeMessage = await generateWelcomeMessage(uid);
    
    // Log successful onboarding
    await logOnboardingCompletion(uid, sessionId);
    
    res.json({
      success: true,
      data: {
        activationResult,
        welcomeMessage,
        systemStatus: 'active',
        completedAt: new Date().toISOString()
      },
      message: "System activated successfully! Welcome to your AI-powered assistant."
    });
    
  } catch (error) {
    console.error("❌ Error activating system:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to activate system"
    });
  }
});

/**
 * @route GET /api/onboarding/status
 * @description Get current onboarding status
 * @access Private
 */
router.get("/status", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📋 Getting onboarding status for user ${uid}`);
    
    const onboardingStatus = await getOnboardingStatus(uid);
    
    res.json({
      success: true,
      data: onboardingStatus,
      message: "Onboarding status retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting onboarding status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get onboarding status"
    });
  }
});

/**
 * @route POST /api/onboarding/skip
 * @description Skip onboarding and use defaults
 * @access Private
 */
router.post("/skip", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`⏭️ Skipping onboarding for user ${uid}`);
    
    // Apply default configuration
    const defaultConfig = await applyDefaultConfiguration(uid);
    
    // Complete onboarding with defaults
    await completeOnboarding(uid, null, true);
    
    res.json({
      success: true,
      data: {
        defaultConfig,
        skipped: true,
        completedAt: new Date().toISOString()
      },
      message: "Onboarding skipped successfully. Default configuration applied."
    });
    
  } catch (error) {
    console.error("❌ Error skipping onboarding:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to skip onboarding"
    });
  }
});

// Helper functions for onboarding

async function getOnboardingStatus(uid) {
  try {
    const query = `
      SELECT * FROM user_onboarding 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const [results] = await dbpromise.execute(query, [uid]);
    
    if (results.length === 0) {
      return {
        completed: false,
        currentStep: 'not_started',
        progress: 0
      };
    }
    
    return {
      completed: results[0].completed,
      currentStep: results[0].current_step,
      progress: results[0].progress,
      completedAt: results[0].completed_at,
      sessionId: results[0].session_id
    };
  } catch (error) {
    console.error("❌ Error getting onboarding status:", error);
    return {
      completed: false,
      currentStep: 'error',
      progress: 0
    };
  }
}

async function initializeOnboardingSession(uid) {
  try {
    const sessionId = `onboarding_${uid}_${Date.now()}`;
    
    const query = `
      INSERT INTO user_onboarding (user_id, session_id, current_step, progress, started_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      session_id = VALUES(session_id),
      current_step = VALUES(current_step),
      progress = VALUES(progress),
      started_at = VALUES(started_at)
    `;
    
    await dbpromise.execute(query, [
      uid,
      sessionId,
      'business_type_selection',
      20,
      new Date()
    ]);
    
    return { sessionId };
  } catch (error) {
    console.error("❌ Error initializing onboarding session:", error);
    throw error;
  }
}

async function getBusinessTypeOptions() {
  return [
    {
      id: 'retail',
      name: 'Retail & E-commerce',
      description: 'Online stores, physical retail, product sales',
      icon: '🛍️',
      features: ['Product catalog', 'Order management', 'Customer support']
    },
    {
      id: 'healthcare',
      name: 'Healthcare & Medical',
      description: 'Clinics, hospitals, medical services',
      icon: '🏥',
      features: ['Appointment booking', 'Patient care', 'Medical information']
    },
    {
      id: 'education',
      name: 'Education & Training',
      description: 'Schools, courses, training programs',
      icon: '📚',
      features: ['Course enrollment', 'Student support', 'Educational content']
    },
    {
      id: 'hospitality',
      name: 'Hospitality & Tourism',
      description: 'Hotels, restaurants, travel services',
      icon: '🏨',
      features: ['Booking management', 'Guest services', 'Travel information']
    },
    {
      id: 'finance',
      name: 'Finance & Banking',
      description: 'Banks, insurance, financial services',
      icon: '🏦',
      features: ['Account management', 'Financial advice', 'Transaction support']
    },
    {
      id: 'technology',
      name: 'Technology & Software',
      description: 'IT services, software companies, tech support',
      icon: '💻',
      features: ['Technical support', 'Product demos', 'Developer resources']
    },
    {
      id: 'real_estate',
      name: 'Real Estate',
      description: 'Property sales, rentals, real estate services',
      icon: '🏠',
      features: ['Property listings', 'Viewing schedules', 'Market information']
    },
    {
      id: 'other',
      name: 'Other',
      description: 'Custom business type',
      icon: '🔧',
      features: ['Custom configuration', 'Flexible setup', 'General purpose']
    }
  ];
}

async function getInitialQuestionnaire() {
  return {
    title: "Let's understand your business better",
    description: "This will help us customize your AI assistant perfectly for your needs.",
    questions: [
      {
        id: 'business_size',
        type: 'select',
        question: 'What size is your business?',
        options: [
          { value: 'solo', label: 'Solo entrepreneur' },
          { value: 'small', label: 'Small team (2-10 people)' },
          { value: 'medium', label: 'Medium business (11-50 people)' },
          { value: 'large', label: 'Large business (50+ people)' }
        ]
      },
      {
        id: 'main_goal',
        type: 'select',
        question: 'What is your main goal with this AI assistant?',
        options: [
          { value: 'sales', label: 'Increase sales and conversions' },
          { value: 'support', label: 'Improve customer support' },
          { value: 'engagement', label: 'Enhance customer engagement' },
          { value: 'efficiency', label: 'Improve operational efficiency' }
        ]
      }
    ]
  };
}

async function validateOnboardingSession(sessionId, uid) {
  try {
    const query = `
      SELECT * FROM user_onboarding 
      WHERE session_id = ? AND user_id = ? AND completed = FALSE
    `;
    
    const [results] = await dbpromise.execute(query, [sessionId, uid]);
    
    return {
      isValid: results.length > 0,
      session: results[0] || null
    };
  } catch (error) {
    console.error("❌ Error validating onboarding session:", error);
    return { isValid: false, session: null };
  }
}

async function saveBusinessTypeSelection(uid, businessType, businessDescription) {
  try {
    const query = `
      INSERT INTO user_business_profile (user_id, business_type, business_description, created_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      business_type = VALUES(business_type),
      business_description = VALUES(business_description),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    await dbpromise.execute(query, [uid, businessType, businessDescription, new Date()]);
  } catch (error) {
    console.error("❌ Error saving business type selection:", error);
    throw error;
  }
}

async function generatePersonalityQuestionnaire(businessType) {
  const baseQuestions = [
    {
      id: 'communication_style',
      type: 'select',
      question: 'How would you like your AI assistant to communicate?',
      options: [
        { value: 'formal', label: 'Formal and professional' },
        { value: 'friendly', label: 'Friendly and approachable' },
        { value: 'casual', label: 'Casual and conversational' },
        { value: 'enthusiastic', label: 'Enthusiastic and energetic' }
      ]
    },
    {
      id: 'response_length',
      type: 'select',
      question: 'How detailed should responses be?',
      options: [
        { value: 'brief', label: 'Brief and to the point' },
        { value: 'moderate', label: 'Moderate detail' },
        { value: 'detailed', label: 'Detailed and comprehensive' },
        { value: 'adaptive', label: 'Adapt based on the question' }
      ]
    },
    {
      id: 'personality_traits',
      type: 'multiselect',
      question: 'Which personality traits are most important for your business?',
      options: [
        { value: 'helpful', label: 'Helpful' },
        { value: 'patient', label: 'Patient' },
        { value: 'knowledgeable', label: 'Knowledgeable' },
        { value: 'empathetic', label: 'Empathetic' },
        { value: 'confident', label: 'Confident' },
        { value: 'respectful', label: 'Respectful' }
      ]
    }
  ];
  
  // Add business-specific questions
  const businessSpecificQuestions = await getBusinessSpecificQuestions(businessType);
  
  return {
    title: "Personality Configuration",
    description: "Let's define your AI assistant's personality",
    questions: [...baseQuestions, ...businessSpecificQuestions]
  };
}

async function getBusinessSpecificQuestions(businessType) {
  const questions = {
    retail: [
      {
        id: 'sales_approach',
        type: 'select',
        question: 'What sales approach do you prefer?',
        options: [
          { value: 'consultative', label: 'Consultative - Focus on understanding needs' },
          { value: 'direct', label: 'Direct - Clear recommendations' },
          { value: 'educational', label: 'Educational - Inform and guide' }
        ]
      }
    ],
    healthcare: [
      {
        id: 'bedside_manner',
        type: 'select',
        question: 'How should the AI handle sensitive health topics?',
        options: [
          { value: 'professional', label: 'Professional and clinical' },
          { value: 'caring', label: 'Caring and empathetic' },
          { value: 'reassuring', label: 'Reassuring and supportive' }
        ]
      }
    ],
    // Add more business-specific questions as needed
  };
  
  return questions[businessType] || [];
}

async function analyzePersonalityAnswers(answers, uid) {
  // Analyze the answers to determine personality traits
  const analysis = {
    communicationStyle: answers.communication_style,
    responseLength: answers.response_length,
    personalityTraits: answers.personality_traits || [],
    businessSpecific: {}
  };
  
  // Add business-specific analysis
  Object.keys(answers).forEach(key => {
    if (!['communication_style', 'response_length', 'personality_traits'].includes(key)) {
      analysis.businessSpecific[key] = answers[key];
    }
  });
  
  return analysis;
}

async function generateRecommendedPersonality(analysis, uid) {
  // Generate personality configuration based on analysis
  const personality = {
    brandVoice: {
      tone: analysis.communicationStyle,
      formality: analysis.communicationStyle === 'formal' ? 'high' : 'medium',
      enthusiasm: analysis.personalityTraits.includes('enthusiastic') ? 'high' : 'medium'
    },
    responseStyle: {
      length: analysis.responseLength,
      detail: analysis.responseLength === 'detailed' ? 'comprehensive' : 'balanced',
      structure: 'organized'
    },
    emotionalIntelligence: {
      empathy: analysis.personalityTraits.includes('empathetic') ? 'high' : 'medium',
      patience: analysis.personalityTraits.includes('patient') ? 'high' : 'medium',
      confidence: analysis.personalityTraits.includes('confident') ? 'high' : 'medium'
    },
    businessContext: analysis.businessSpecific
  };
  
  return personality;
}

async function updateOnboardingProgress(uid, currentStep, stepNumber) {
  try {
    const query = `
      UPDATE user_onboarding 
      SET current_step = ?, progress = ?
      WHERE user_id = ? AND completed = FALSE
    `;
    
    const progress = (stepNumber / 5) * 100;
    await dbpromise.execute(query, [currentStep, progress, uid]);
  } catch (error) {
    console.error("❌ Error updating onboarding progress:", error);
    throw error;
  }
}

async function getSheetsSetupOptions() {
  return {
    title: "Google Sheets Integration",
    description: "Connect your business data for intelligent responses",
    options: [
      {
        id: 'existing_sheet',
        name: 'Connect Existing Sheet',
        description: 'Link your existing Google Sheets document',
        icon: '📊',
        requirements: ['Google Sheets URL', 'Read/Write permissions']
      },
      {
        id: 'template',
        name: 'Use Template',
        description: 'Start with a pre-designed template',
        icon: '📋',
        requirements: ['Template selection', 'Google account']
      },
      {
        id: 'manual',
        name: 'Manual Setup',
        description: 'Set up later or use without sheets',
        icon: '✏️',
        requirements: ['None - can be configured later']
      }
    ]
  };
}

// Additional helper functions (placeholder implementations)

async function setupExistingSheet(uid, sheetUrl) {
  // Implementation for setting up existing sheet
  return { sheetId: 'existing_sheet_id', status: 'connected' };
}

async function setupFromTemplate(uid, templateType) {
  // Implementation for setting up from template
  return { sheetId: 'template_sheet_id', status: 'created' };
}

async function setupManualSheet(uid) {
  // Implementation for manual setup
  return { sheetId: null, status: 'manual' };
}

async function testSheetConnection(uid, sheetId) {
  // Implementation for testing sheet connection
  return { connected: true, dataRows: 10, lastSync: new Date() };
}

async function generateSampleConversations(uid) {
  // Implementation for generating sample conversations
  return [
    { id: 1, scenario: 'Product inquiry', preview: 'Hi, I\'m looking for...' },
    { id: 2, scenario: 'Support request', preview: 'I need help with...' },
    { id: 3, scenario: 'Booking inquiry', preview: 'I\'d like to book...' }
  ];
}

async function testSampleConversations(uid, samples) {
  // Implementation for testing sample conversations
  return samples.map(sample => ({
    ...sample,
    aiResponse: 'AI generated response',
    quality: 'good',
    responseTime: 1.2
  }));
}

async function analyzeConversationQuality(testResults) {
  // Implementation for analyzing conversation quality
  return {
    overallQuality: 'good',
    averageResponseTime: 1.2,
    accuracyScore: 0.85,
    naturalness: 0.9
  };
}

async function generateImprovementSuggestions(qualityAnalysis) {
  // Implementation for generating improvement suggestions
  return [
    'Consider adding more product details to your knowledge base',
    'Response time is excellent - keep it up!',
    'AI personality matches your business well'
  ];
}

async function prepareActivation(uid) {
  // Implementation for preparing activation
  return {
    systemReady: true,
    aiConfigured: true,
    sheetsConnected: true,
    personalitySet: true
  };
}

async function activateAISystem(uid) {
  // Implementation for activating AI system
  return { activated: true, activatedAt: new Date() };
}

async function completeOnboarding(uid, sessionId, skipped = false) {
  try {
    const query = `
      UPDATE user_onboarding 
      SET completed = TRUE, completed_at = ?, skipped = ?
      WHERE user_id = ? AND (session_id = ? OR ? IS NULL)
    `;
    
    await dbpromise.execute(query, [new Date(), skipped, uid, sessionId, sessionId]);
  } catch (error) {
    console.error("❌ Error completing onboarding:", error);
    throw error;
  }
}

async function initializeRealTimeFeatures(uid) {
  // Implementation for initializing real-time features
  return { initialized: true };
}

async function generateWelcomeMessage(uid) {
  // Implementation for generating welcome message
  return {
    message: "Welcome to your AI-powered assistant! I'm ready to help your business grow.",
    nextSteps: [
      'Try asking me about your products or services',
      'Check out the analytics dashboard',
      'Customize my personality further if needed'
    ]
  };
}

async function logOnboardingCompletion(uid, sessionId) {
  try {
    const query = `
      INSERT INTO ai_analytics (event_type, user_id, response_time, success, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await dbpromise.execute(query, [
      'onboarding_completed',
      uid,
      new Date(),
      true,
      JSON.stringify({ sessionId })
    ]);
  } catch (error) {
    console.error("❌ Error logging onboarding completion:", error);
  }
}

async function applyDefaultConfiguration(uid) {
  // Implementation for applying default configuration
  const defaultPersonality = {
    brandVoice: {
      tone: 'friendly',
      formality: 'medium',
      enthusiasm: 'medium'
    },
    responseStyle: {
      length: 'moderate',
      detail: 'balanced',
      structure: 'organized'
    },
    emotionalIntelligence: {
      empathy: 'medium',
      patience: 'medium',
      confidence: 'medium'
    }
  };
  
  await personalityEngine.updateUserPersonality(uid, defaultPersonality);
  
  return { applied: true, personality: defaultPersonality };
}

module.exports = router;
