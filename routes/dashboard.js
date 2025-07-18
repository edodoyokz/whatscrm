const express = require("express");
const router = express.Router();
const { dbpromise } = require("../database/dbpromise");
const user = require("../middlewares/user");

// AI Components for Dashboard
const personalityEngine = require("../ai/personality_engine");
const advancedAnalytics = require("../ai/advanced_analytics");
const contextManager = require("../ai/context_manager");
const aiProviderManager = require("../ai/ai_provider_manager");

/**
 * Dashboard Transformation System
 * AI-focused dashboard with personality configuration and real-time monitoring
 */

/**
 * @route GET /api/dashboard/ai-overview
 * @description Get AI-focused dashboard overview
 * @access Private
 */
router.get("/ai-overview", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🎨 Getting AI dashboard overview for user ${uid}`);
    
    // Get AI system status
    const aiStatus = await getAISystemStatus(uid);
    
    // Get conversation analytics
    const conversationAnalytics = await getConversationAnalytics(uid);
    
    // Get personality configuration
    const personalityConfig = await getPersonalityConfiguration(uid);
    
    // Get real-time metrics
    const realTimeMetrics = await getRealTimeMetrics(uid);
    
    // Get knowledge base status
    const knowledgeBaseStatus = await getKnowledgeBaseStatus(uid);
    
    const dashboardData = {
      aiStatus,
      conversationAnalytics,
      personalityConfig,
      realTimeMetrics,
      knowledgeBaseStatus,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: dashboardData,
      message: "AI dashboard overview retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting AI dashboard overview:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get AI dashboard overview"
    });
  }
});

/**
 * @route GET /api/dashboard/personality-config
 * @description Get personality configuration interface data
 * @access Private
 */
router.get("/personality-config", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🎭 Getting personality configuration for user ${uid}`);
    
    // Get current personality settings
    const currentPersonality = await personalityEngine.getUserPersonality(uid);
    
    // Get available personality templates
    const personalityTemplates = await getPersonalityTemplates();
    
    // Get industry-specific options
    const industryOptions = await getIndustryOptions();
    
    // Get communication style options
    const communicationStyles = await getCommunicationStyles();
    
    // Get emotional tone options
    const emotionalTones = await getEmotionalTones();
    
    const configData = {
      currentPersonality,
      personalityTemplates,
      industryOptions,
      communicationStyles,
      emotionalTones,
      customization: {
        brandVoice: currentPersonality?.brandVoice || {},
        responseStyle: currentPersonality?.responseStyle || {},
        emotionalIntelligence: currentPersonality?.emotionalIntelligence || {}
      }
    };
    
    res.json({
      success: true,
      data: configData,
      message: "Personality configuration retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting personality configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get personality configuration"
    });
  }
});

/**
 * @route POST /api/dashboard/personality-config
 * @description Update personality configuration
 * @access Private
 */
router.post("/personality-config", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { personalityConfig } = req.body;
    
    console.log(`🎭 Updating personality configuration for user ${uid}`);
    
    // Validate personality configuration
    const validationResult = await validatePersonalityConfig(personalityConfig);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.errors,
        message: "Invalid personality configuration"
      });
    }
    
    // Update personality configuration
    const updatedPersonality = await personalityEngine.updateUserPersonality(uid, personalityConfig);
    
    // Log configuration change
    await logPersonalityChange(uid, personalityConfig);
    
    res.json({
      success: true,
      data: updatedPersonality,
      message: "Personality configuration updated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error updating personality configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update personality configuration"
    });
  }
});

/**
 * @route GET /api/dashboard/conversation-monitor
 * @description Get real-time conversation monitoring data
 * @access Private
 */
router.get("/conversation-monitor", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`💬 Getting conversation monitoring data for user ${uid}`);
    
    // Get active conversations
    const activeConversations = await getActiveConversations(uid);
    
    // Get conversation analytics
    const conversationMetrics = await getConversationMetrics(uid);
    
    // Get AI performance metrics
    const aiPerformanceMetrics = await getAIPerformanceMetrics(uid);
    
    // Get real-time alerts
    const realTimeAlerts = await getRealTimeAlerts(uid);
    
    const monitoringData = {
      activeConversations,
      conversationMetrics,
      aiPerformanceMetrics,
      realTimeAlerts,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: monitoringData,
      message: "Conversation monitoring data retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting conversation monitoring data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get conversation monitoring data"
    });
  }
});

/**
 * @route GET /api/dashboard/analytics
 * @description Get natural language analytics dashboard
 * @access Private
 */
router.get("/analytics", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { timeRange } = req.query;
    
    console.log(`📊 Getting analytics dashboard for user ${uid}`);
    
    // Get comprehensive analytics report
    const analyticsReport = await advancedAnalytics.generateAnalyticsReport(uid, timeRange);
    
    // Get conversation insights
    const conversationInsights = await getConversationInsights(uid, timeRange);
    
    // Get AI accuracy metrics
    const accuracyMetrics = await getAccuracyMetrics(uid, timeRange);
    
    // Get business impact metrics
    const businessImpact = await getBusinessImpact(uid, timeRange);
    
    // Get user engagement trends
    const engagementTrends = await getEngagementTrends(uid, timeRange);
    
    const analyticsData = {
      analyticsReport,
      conversationInsights,
      accuracyMetrics,
      businessImpact,
      engagementTrends,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: analyticsData,
      message: "Analytics dashboard retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting analytics dashboard:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get analytics dashboard"
    });
  }
});

/**
 * @route GET /api/dashboard/knowledge-base
 * @description Get knowledge base management interface
 * @access Private
 */
router.get("/knowledge-base", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📚 Getting knowledge base management for user ${uid}`);
    
    // Get knowledge base status
    const knowledgeBaseStatus = await getKnowledgeBaseStatus(uid);
    
    // Get Google Sheets integration status
    const sheetsIntegration = await getSheetsIntegrationStatus(uid);
    
    // Get cached knowledge items
    const cachedKnowledge = await getCachedKnowledge(uid);
    
    // Get knowledge base metrics
    const knowledgeMetrics = await getKnowledgeMetrics(uid);
    
    const knowledgeData = {
      knowledgeBaseStatus,
      sheetsIntegration,
      cachedKnowledge,
      knowledgeMetrics,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: knowledgeData,
      message: "Knowledge base management retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting knowledge base management:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get knowledge base management"
    });
  }
});

/**
 * @route POST /api/dashboard/knowledge-base/sync
 * @description Trigger knowledge base synchronization
 * @access Private
 */
router.post("/knowledge-base/sync", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { forceSync } = req.body;
    
    console.log(`🔄 Triggering knowledge base sync for user ${uid}`);
    
    // Trigger knowledge base sync
    const syncResult = await triggerKnowledgeBaseSync(uid, forceSync);
    
    res.json({
      success: true,
      data: syncResult,
      message: "Knowledge base synchronization triggered successfully"
    });
    
  } catch (error) {
    console.error("❌ Error triggering knowledge base sync:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to trigger knowledge base synchronization"
    });
  }
});

/**
 * @route GET /api/dashboard/system-health
 * @description Get system health for dashboard
 * @access Private
 */
router.get("/system-health", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🔍 Getting system health for user ${uid}`);
    
    const systemHealth = {
      aiProviders: await getAIProviderHealth(),
      database: await getDatabaseHealth(),
      realTimeFeatures: await getRealTimeFeaturesHealth(),
      knowledgeBase: await getKnowledgeBaseHealth(uid),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: systemHealth,
      message: "System health retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting system health:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get system health"
    });
  }
});

// Helper functions for dashboard data

async function getAISystemStatus(uid) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_conversations,
        AVG(satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as conversations_24h
      FROM conversations 
      WHERE user_id = ?
    `;
    
    const [results] = await dbpromise.execute(query, [uid]);
    
    return {
      totalConversations: results[0].total_conversations || 0,
      avgSatisfaction: results[0].avg_satisfaction || 0,
      conversations24h: results[0].conversations_24h || 0,
      aiProviderStatus: await aiProviderManager.getProvidersStatus(),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error getting AI system status:", error);
    return {
      totalConversations: 0,
      avgSatisfaction: 0,
      conversations24h: 0,
      aiProviderStatus: {},
      lastUpdated: new Date().toISOString()
    };
  }
}

async function getConversationAnalytics(uid) {
  try {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as conversation_count,
        AVG(satisfaction_rating) as avg_satisfaction,
        AVG(response_time) as avg_response_time
      FROM conversations 
      WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const [results] = await dbpromise.execute(query, [uid]);
    
    return {
      weeklyTrends: results,
      totalConversations: results.reduce((sum, row) => sum + row.conversation_count, 0),
      avgSatisfaction: results.reduce((sum, row) => sum + row.avg_satisfaction, 0) / results.length || 0,
      avgResponseTime: results.reduce((sum, row) => sum + row.avg_response_time, 0) / results.length || 0
    };
  } catch (error) {
    console.error("❌ Error getting conversation analytics:", error);
    return {
      weeklyTrends: [],
      totalConversations: 0,
      avgSatisfaction: 0,
      avgResponseTime: 0
    };
  }
}

async function getPersonalityConfiguration(uid) {
  try {
    return await personalityEngine.getUserPersonality(uid);
  } catch (error) {
    console.error("❌ Error getting personality configuration:", error);
    return null;
  }
}

async function getRealTimeMetrics(uid) {
  try {
    return await advancedAnalytics.getRealTimeDashboard(uid);
  } catch (error) {
    console.error("❌ Error getting real-time metrics:", error);
    return {
      currentMetrics: {},
      trends: {},
      alerts: [],
      kpis: {}
    };
  }
}

async function getKnowledgeBaseStatus(uid) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        MAX(updated_at) as last_updated,
        COUNT(CASE WHEN source = 'google_sheets' THEN 1 END) as sheets_items,
        COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_items
      FROM ai_knowledge_cache 
      WHERE user_id = ?
    `;
    
    const [results] = await dbpromise.execute(query, [uid]);
    
    return {
      totalItems: results[0].total_items || 0,
      lastUpdated: results[0].last_updated,
      sheetsItems: results[0].sheets_items || 0,
      manualItems: results[0].manual_items || 0,
      syncStatus: 'active'
    };
  } catch (error) {
    console.error("❌ Error getting knowledge base status:", error);
    return {
      totalItems: 0,
      lastUpdated: null,
      sheetsItems: 0,
      manualItems: 0,
      syncStatus: 'error'
    };
  }
}

async function getPersonalityTemplates() {
  return [
    {
      id: 'friendly_professional',
      name: 'Friendly Professional',
      description: 'Warm, professional, and approachable',
      traits: ['friendly', 'professional', 'helpful', 'respectful']
    },
    {
      id: 'energetic_sales',
      name: 'Energetic Sales',
      description: 'High-energy, persuasive, and enthusiastic',
      traits: ['energetic', 'persuasive', 'enthusiastic', 'confident']
    },
    {
      id: 'calm_support',
      name: 'Calm Support',
      description: 'Patient, understanding, and solution-focused',
      traits: ['patient', 'understanding', 'calm', 'helpful']
    },
    {
      id: 'expert_consultant',
      name: 'Expert Consultant',
      description: 'Knowledgeable, analytical, and thorough',
      traits: ['knowledgeable', 'analytical', 'thorough', 'professional']
    }
  ];
}

async function getIndustryOptions() {
  return [
    { id: 'retail', name: 'Retail & E-commerce' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'finance', name: 'Finance & Banking' },
    { id: 'education', name: 'Education' },
    { id: 'hospitality', name: 'Hospitality & Tourism' },
    { id: 'technology', name: 'Technology' },
    { id: 'real_estate', name: 'Real Estate' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'food_beverage', name: 'Food & Beverage' },
    { id: 'other', name: 'Other' }
  ];
}

async function getCommunicationStyles() {
  return [
    { id: 'formal', name: 'Formal', description: 'Professional and structured' },
    { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
    { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
    { id: 'direct', name: 'Direct', description: 'Straightforward and concise' },
    { id: 'consultative', name: 'Consultative', description: 'Thorough and advisory' }
  ];
}

async function getEmotionalTones() {
  return [
    { id: 'empathetic', name: 'Empathetic', description: 'Understanding and supportive' },
    { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and positive' },
    { id: 'calm', name: 'Calm', description: 'Peaceful and reassuring' },
    { id: 'confident', name: 'Confident', description: 'Self-assured and decisive' },
    { id: 'patient', name: 'Patient', description: 'Tolerant and understanding' }
  ];
}

async function validatePersonalityConfig(config) {
  // Basic validation logic
  const errors = [];
  
  if (!config.brandVoice) {
    errors.push('Brand voice configuration is required');
  }
  
  if (!config.responseStyle) {
    errors.push('Response style configuration is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function logPersonalityChange(uid, config) {
  try {
    const query = `
      INSERT INTO ai_analytics (event_type, user_id, response_time, success, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await dbpromise.execute(query, [
      'personality_config_change',
      uid,
      new Date(),
      true,
      JSON.stringify(config)
    ]);
  } catch (error) {
    console.error("❌ Error logging personality change:", error);
  }
}

// Additional helper functions (placeholder implementations)

async function getActiveConversations(uid) {
  // Implementation for getting active conversations
  return [];
}

async function getConversationMetrics(uid) {
  // Implementation for getting conversation metrics
  return {};
}

async function getAIPerformanceMetrics(uid) {
  // Implementation for getting AI performance metrics
  return {};
}

async function getRealTimeAlerts(uid) {
  // Implementation for getting real-time alerts
  return [];
}

async function getConversationInsights(uid, timeRange) {
  // Implementation for getting conversation insights
  return {};
}

async function getAccuracyMetrics(uid, timeRange) {
  // Implementation for getting accuracy metrics
  return {};
}

async function getBusinessImpact(uid, timeRange) {
  // Implementation for getting business impact
  return {};
}

async function getEngagementTrends(uid, timeRange) {
  // Implementation for getting engagement trends
  return {};
}

async function getSheetsIntegrationStatus(uid) {
  // Implementation for getting sheets integration status
  return {};
}

async function getCachedKnowledge(uid) {
  // Implementation for getting cached knowledge
  return [];
}

async function getKnowledgeMetrics(uid) {
  // Implementation for getting knowledge metrics
  return {};
}

async function triggerKnowledgeBaseSync(uid, forceSync) {
  // Implementation for triggering knowledge base sync
  return { syncTriggered: true, forceSync };
}

async function getAIProviderHealth() {
  // Implementation for getting AI provider health
  return { openai: 'healthy', gemini: 'healthy', deepseek: 'healthy' };
}

async function getDatabaseHealth() {
  // Implementation for getting database health
  return { status: 'healthy', responseTime: '< 100ms' };
}

async function getRealTimeFeaturesHealth() {
  // Implementation for getting real-time features health
  return { status: 'healthy', activeConnections: 0 };
}

async function getKnowledgeBaseHealth(uid) {
  // Implementation for getting knowledge base health
  return { status: 'healthy', syncStatus: 'active' };
}

module.exports = router;
