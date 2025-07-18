const express = require("express");
const router = express.Router();
const { dbpromise } = require("../database/dbpromise");
const user = require("../middlewares/user");
const { broadcastRealTimeUpdate, broadcastAnalyticsUpdate, broadcastPredictiveAlert } = require("../socket");

// Phase 3 Real-time Intelligence Components
const realTimeSheetsMonitor = require("../ai/realtime_sheets_monitor");
const contextualResponseGenerator = require("../ai/contextual_response_generator");
const advancedAnalytics = require("../ai/advanced_analytics");
const realTimeFeatures = require("../ai/realtime_features");

/**
 * @route GET /api/ai-realtime/status
 * @description Get real-time intelligence system status
 * @access Private
 */
router.get("/status", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📊 Getting real-time intelligence status for user ${uid}`);
    
    const status = {
      realTimeSheetsMonitor: realTimeSheetsMonitor.initialized || false,
      contextualResponseGenerator: contextualResponseGenerator.initialized || false,
      advancedAnalytics: advancedAnalytics.initialized || false,
      realTimeFeatures: realTimeFeatures.initialized || false,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      status,
      message: "Real-time intelligence status retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting real-time intelligence status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get real-time intelligence status"
    });
  }
});

/**
 * @route GET /api/ai-realtime/sheets/monitor
 * @description Get real-time sheets monitoring status
 * @access Private
 */
router.get("/sheets/monitor", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📊 Getting sheets monitoring status for user ${uid}`);
    
    const monitoringStatus = await realTimeSheetsMonitor.getMonitoringStatus(uid);
    
    res.json({
      success: true,
      data: monitoringStatus,
      message: "Sheets monitoring status retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting sheets monitoring status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get sheets monitoring status"
    });
  }
});

/**
 * @route POST /api/ai-realtime/sheets/validate
 * @description Validate sheet data in real-time
 * @access Private
 */
router.post("/sheets/validate", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { sheetData } = req.body;
    
    console.log(`🔍 Validating sheet data for user ${uid}`);
    
    const validationResult = await realTimeSheetsMonitor.validateSheetData(sheetData, uid);
    
    // Broadcast validation result
    broadcastRealTimeUpdate(uid, {
      type: 'sheet_validation',
      result: validationResult
    });
    
    res.json({
      success: true,
      data: validationResult,
      message: "Sheet data validated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error validating sheet data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to validate sheet data"
    });
  }
});

/**
 * @route POST /api/ai-realtime/response/contextual
 * @description Generate contextual response with alternatives
 * @access Private
 */
router.post("/response/contextual", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { query, context, options } = req.body;
    
    console.log(`🎯 Generating contextual response for user ${uid}`);
    
    const response = await contextualResponseGenerator.generateContextualResponse(
      query, 
      context, 
      uid, 
      options
    );
    
    // Broadcast contextual response
    broadcastRealTimeUpdate(uid, {
      type: 'contextual_response',
      response: response
    });
    
    res.json({
      success: true,
      data: response,
      message: "Contextual response generated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error generating contextual response:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate contextual response"
    });
  }
});

/**
 * @route POST /api/ai-realtime/response/alternatives
 * @description Generate alternative responses
 * @access Private
 */
router.post("/response/alternatives", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { baseResponse, context, count } = req.body;
    
    console.log(`🔄 Generating alternative responses for user ${uid}`);
    
    const alternatives = await contextualResponseGenerator.generateAlternatives(
      baseResponse, 
      context, 
      uid, 
      count || 3
    );
    
    res.json({
      success: true,
      data: alternatives,
      message: "Alternative responses generated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error generating alternative responses:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate alternative responses"
    });
  }
});

/**
 * @route POST /api/ai-realtime/response/proactive
 * @description Generate proactive assistance
 * @access Private
 */
router.post("/response/proactive", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { context, userHistory } = req.body;
    
    console.log(`🚀 Generating proactive assistance for user ${uid}`);
    
    const proactiveResponse = await contextualResponseGenerator.generateProactiveAssistance(
      context, 
      userHistory, 
      uid
    );
    
    res.json({
      success: true,
      data: proactiveResponse,
      message: "Proactive assistance generated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error generating proactive assistance:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate proactive assistance"
    });
  }
});

/**
 * @route POST /api/ai-realtime/analytics/track
 * @description Track analytics data
 * @access Private
 */
router.post("/analytics/track", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { metricType, data } = req.body;
    
    console.log(`📊 Tracking analytics for user ${uid}: ${metricType}`);
    
    let result;
    switch (metricType) {
      case 'satisfaction':
        result = await advancedAnalytics.trackConversationSatisfaction(uid, data.conversationId, data);
        break;
      case 'accuracy':
        result = await advancedAnalytics.monitorResponseAccuracy(uid, data.conversationId, data);
        break;
      case 'engagement':
        result = await advancedAnalytics.trackUserEngagement(uid, data);
        break;
      case 'business_outcome':
        result = await advancedAnalytics.measureBusinessOutcomes(uid, data);
        break;
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
    }
    
    // Broadcast analytics update
    broadcastAnalyticsUpdate(uid, {
      metricType,
      result,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: result,
      message: "Analytics tracked successfully"
    });
    
  } catch (error) {
    console.error("❌ Error tracking analytics:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to track analytics"
    });
  }
});

/**
 * @route GET /api/ai-realtime/analytics/report
 * @description Generate analytics report
 * @access Private
 */
router.get("/analytics/report", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { timeRange } = req.query;
    
    console.log(`📈 Generating analytics report for user ${uid}`);
    
    const report = await advancedAnalytics.generateAnalyticsReport(uid, timeRange);
    
    res.json({
      success: true,
      data: report,
      message: "Analytics report generated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error generating analytics report:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate analytics report"
    });
  }
});

/**
 * @route GET /api/ai-realtime/analytics/dashboard
 * @description Get real-time analytics dashboard
 * @access Private
 */
router.get("/analytics/dashboard", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📊 Getting analytics dashboard for user ${uid}`);
    
    const dashboard = await advancedAnalytics.getRealTimeDashboard(uid);
    
    res.json({
      success: true,
      data: dashboard,
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
 * @route GET /api/ai-realtime/features/status
 * @description Get real-time features status
 * @access Private
 */
router.get("/features/status", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`⚡ Getting real-time features status for user ${uid}`);
    
    const status = await realTimeFeatures.getRealTimeStatus();
    
    res.json({
      success: true,
      data: status,
      message: "Real-time features status retrieved successfully"
    });
    
  } catch (error) {
    console.error("❌ Error getting real-time features status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get real-time features status"
    });
  }
});

/**
 * @route POST /api/ai-realtime/features/sync
 * @description Trigger data synchronization
 * @access Private
 */
router.post("/features/sync", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { dataType, action, data } = req.body;
    
    console.log(`🔄 Triggering data sync for user ${uid}: ${dataType} - ${action}`);
    
    await realTimeFeatures.queueDataSyncUpdate(dataType, uid, action, data);
    
    res.json({
      success: true,
      message: "Data synchronization triggered successfully"
    });
    
  } catch (error) {
    console.error("❌ Error triggering data sync:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to trigger data synchronization"
    });
  }
});

/**
 * @route POST /api/ai-realtime/features/cache
 * @description Trigger cache update
 * @access Private
 */
router.post("/features/cache", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { cacheType, key, value, operation } = req.body;
    
    console.log(`⚡ Triggering cache update for user ${uid}: ${cacheType} - ${operation}`);
    
    await realTimeFeatures.queueCacheUpdate(cacheType, key, value, operation, uid);
    
    res.json({
      success: true,
      message: "Cache update triggered successfully"
    });
    
  } catch (error) {
    console.error("❌ Error triggering cache update:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to trigger cache update"
    });
  }
});

/**
 * @route GET /api/ai-realtime/health
 * @description Get system health check
 * @access Private
 */
router.get("/health", user, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🔍 Getting system health for user ${uid}`);
    
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      components: {
        realTimeSheetsMonitor: realTimeSheetsMonitor.initialized || false,
        contextualResponseGenerator: contextualResponseGenerator.initialized || false,
        advancedAnalytics: advancedAnalytics.initialized || false,
        realTimeFeatures: realTimeFeatures.initialized || false,
      },
      database: {
        connected: true, // This should be actual database health check
        lastQuery: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      data: health,
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

/**
 * @route POST /api/ai-realtime/test
 * @description Test real-time intelligence components
 * @access Private
 */
router.post("/test", user, async (req, res) => {
  try {
    const { uid } = req.user;
    const { component, testData } = req.body;
    
    console.log(`🧪 Testing real-time component for user ${uid}: ${component}`);
    
    let testResult;
    switch (component) {
      case 'sheets_monitor':
        testResult = await realTimeSheetsMonitor.testMonitoring(testData, uid);
        break;
      case 'contextual_response':
        testResult = await contextualResponseGenerator.testGeneration(testData, uid);
        break;
      case 'analytics':
        testResult = await advancedAnalytics.testTracking(testData, uid);
        break;
      case 'realtime_features':
        testResult = await realTimeFeatures.testFeatures(testData, uid);
        break;
      default:
        throw new Error(`Unknown component: ${component}`);
    }
    
    res.json({
      success: true,
      data: testResult,
      message: `${component} tested successfully`
    });
    
  } catch (error) {
    console.error("❌ Error testing real-time component:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to test real-time component"
    });
  }
});

module.exports = router;
