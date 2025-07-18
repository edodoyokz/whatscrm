// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { query } = require("./database/dbpromise");
const { processSocketEvent } = require("./helper/socket");

// AI Integration
const naturalConversationEngine = require("./ai/natural_conversation_engine");
const contextManager = require("./ai/context_manager");
const sheetsIntelligence = require("./ai/sheets_intelligence");
const realTimeSheetsMonitor = require("./ai/realtime_sheets_monitor");
const contextualResponseGenerator = require("./ai/contextual_response_generator");
const advancedAnalytics = require("./ai/advanced_analytics");
const realTimeFeatures = require("./ai/realtime_features");

let ioInstance = null;

// Database functions
async function getUserData(uid) {
  try {
    const [user] = await query("SELECT * FROM user WHERE uid = ?", [uid]);
    return user || null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error; // Rethrow for better error handling upstream
  }
}

async function getAgentData(uid) {
  try {
    const [agent] = await query(`SELECT * FROM agents where uid = ?`, [uid]);
    if (agent) {
      const [owner] = await query(`SELECT * FROM user where uid = ?`, [
        agent?.owner_uid,
      ]);
      return {
        ...agent,
        owner: owner || {},
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching agent data:", error);
    throw error;
  }
}

// Socket initialization
function initializeSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*", // Consider environment-based configuration
      methods: ["GET", "POST"],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Authentication middleware
  ioInstance.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.query; // Changed from query to auth for better security

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, process.env.JWTKEY);
      socket.decodedToken = decoded;
      next();
    } catch (error) {
      console.error("Authentication failed:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  ioInstance.on("connection", async (socket) => {
    try {
      const { uid, role } = socket.decodedToken;
      const isAgent = role === "agent";

      // console.log(`New connection attempt from UID: ${uid}`);

      const userData = isAgent
        ? await getAgentData(uid)
        : await getUserData(uid);

      if (!userData) {
        throw new Error("User data not found");
      }

      // Store user data on socket
      socket.userData = {
        ...userData,
        socketId: socket.id,
        isAgent,
        connectedAt: new Date(),
      };

      // Success response
      socket.emit("connection_ack", {
        status: "success",
        socketId: socket.id,
        userData: {
          uid: userData.uid,
          name: userData.name,
          email: userData.email,
          isAgent,
          ...(isAgent && { owner: userData.owner_uid }),
        },
      });

      // console.log({
      //   msg: "Socket established",
      //   id: socket.id,
      //   uid: uid,
      //   isAgent,
      // });
    } catch (error) {
      console.error("Connection setup failed:", error.message);
      socket.emit("connection_ack", {
        status: "error",
        message: error.message,
      });
      socket.disconnect(true);
      return;
    }

    processSocketEvent({
      socket,
      initializeSocket,
      sendToUid,
      sendToSocket,
      sendToAll,
      getConnectedUsers,
      getConnectionsByUid,
      getConnectionBySocketId,
      getAllSocketData,
    });

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      console.log(`Disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error(`Socket error (${socket.id}):`, error);
    });
  });

  // Initialize Phase 3 components
  initializePhase3Components();

  // Initialize Phase 4 components
  initializePhase4Components();

  return ioInstance;
}

// Utility functions
function sendToUid(uid, data, event = "message") {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  let sentCount = 0;
  ioInstance.sockets.sockets.forEach((socket) => {
    if (
      socket.userData &&
      (socket.userData.uid === uid ||
        (socket.userData.isAgent && socket.userData.owner_uid === uid))
    ) {
      socket.emit(event, data);
      sentCount++;
    }
  });

  return sentCount;
}

function sendToSocket(socketId, data, event = "message") {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  const socket = ioInstance.sockets.sockets.get(socketId);
  if (socket) {
    socket.emit(event, data);
    return true;
  }

  console.warn(`Socket not found: ${socketId}`);
  return false;
}

function sendToAll(data, event = "message") {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  ioInstance.emit(event, data);
  return true;
}

// AI-Enhanced Socket Functions
function broadcastAIUpdate(uid, update) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  const data = {
    type: 'ai_update',
    timestamp: new Date().toISOString(),
    ...update
  };

  return sendToUid(uid, data, "ai_update");
}

function broadcastConversationUpdate(uid, conversationData) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  const data = {
    type: 'conversation_update',
    timestamp: new Date().toISOString(),
    conversation: conversationData
  };

  return sendToUid(uid, data, "conversation_update");
}

function broadcastSheetsUpdate(uid, sheetsData) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  const data = {
    type: 'sheets_update',
    timestamp: new Date().toISOString(),
    sheets: sheetsData
  };

  return sendToUid(uid, data, "sheets_update");
}

function broadcastAIStatus(uid, status) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return false;
  }

  const data = {
    type: 'ai_status',
    timestamp: new Date().toISOString(),
    status: status
  };

  return sendToUid(uid, data, "ai_status");
}

function getConnectedUsers() {
  if (!ioInstance) return [];

  const users = [];
  ioInstance.sockets.sockets.forEach((socket) => {
    if (socket.userData) {
      users.push({
        socketId: socket.id,
        uid: socket.userData.uid,
        isAgent: socket.userData.isAgent,
        connectedAt: socket.userData.connectedAt,
        ...(socket.userData.isAgent && { owner: socket.userData.owner_uid }),
      });
    }
  });
  return users;
}

// New functions
// function getConnectionsByUid(uid) {
//   if (!ioInstance) {
//     console.warn("Socket.IO instance not initialized");
//     return [];
//   }

//   const connections = [];
//   ioInstance.sockets.sockets.forEach((socket) => {
//     if (socket.userData && socket.userData.uid === uid) {
//       connections.push({
//         socketId: socket.id,
//         userData: socket.userData,
//         connectedAt: socket.userData.connectedAt,
//       });
//     }
//   });

//   return connections;
// }

function getConnectionsByUid(uid, includeAgents = false) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return [];
  }

  const connections = [];
  ioInstance.sockets.sockets.forEach((socket) => {
    if (socket.userData) {
      // Include direct uid matches
      if (socket.userData.uid === uid) {
        connections.push({
          socketId: socket.id,
          userData: socket.userData,
          connectedAt: socket.userData.connectedAt,
        });
      }
      // If includeAgents is true, also include agents where owner_uid matches
      else if (
        includeAgents &&
        socket.userData.isAgent &&
        socket.userData.owner_uid === uid
      ) {
        connections.push({
          socketId: socket.id,
          userData: socket.userData,
          connectedAt: socket.userData.connectedAt,
          isOwnedAgent: true, // Optional flag to identify these connections
        });
      }
    }
  });

  return connections;
}

function getConnectionBySocketId(socketId) {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return null;
  }

  const socket = ioInstance.sockets.sockets.get(socketId);
  if (!socket || !socket.userData) {
    return null;
  }

  return {
    socketId: socket.id,
    userData: socket.userData,
    connectedAt: socket.userData.connectedAt,
    handshake: socket.handshake,
    rooms: Array.from(socket.rooms),
  };
}

// AI Event Handlers
function setupAIEventHandlers() {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  // Listen for AI processing events
  ioInstance.on("connection", (socket) => {
    // AI-related event handlers
    socket.on("ai_message_process", async (data) => {
      try {
        const { message, userId, phone } = data;
        
        // Notify start of AI processing
        socket.emit("ai_processing_start", {
          messageId: data.messageId,
          timestamp: new Date().toISOString()
        });

        // Process message with AI
        const result = await naturalConversationEngine.processMessage({
          userId,
          phone,
          message,
          type: 'text',
          startTime: Date.now()
        });

        // Notify completion
        socket.emit("ai_processing_complete", {
          messageId: data.messageId,
          result: result,
          timestamp: new Date().toISOString()
        });

        // Broadcast to all connected clients for this user
        broadcastConversationUpdate(userId, result);
      } catch (error) {
        console.error("AI processing error:", error);
        socket.emit("ai_processing_error", {
          messageId: data.messageId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Real-time context updates
    socket.on("ai_context_update", async (data) => {
      try {
        const { userId, contextData } = data;
        
        await contextManager.updateConversationContext(userId, contextData);
        
        // Broadcast context update
        broadcastAIUpdate(userId, {
          type: 'context_updated',
          context: contextData
        });
      } catch (error) {
        console.error("Context update error:", error);
        socket.emit("ai_context_error", {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Real-time sheets updates
    socket.on("sheets_data_changed", async (data) => {
      try {
        const { userId, sheetData } = data;
        
        // Update sheets intelligence
        await sheetsIntelligence.updateCache(sheetData);
        
        // Broadcast sheets update
        broadcastSheetsUpdate(userId, sheetData);
      } catch (error) {
        console.error("Sheets update error:", error);
        socket.emit("sheets_update_error", {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // AI status monitoring
    socket.on("ai_status_request", async (data) => {
      try {
        const status = {
          aiEngine: naturalConversationEngine.initialized || false,
          contextManager: contextManager.initialized || false,
          sheetsIntelligence: sheetsIntelligence.initialized || false,
          timestamp: new Date().toISOString()
        };

        socket.emit("ai_status_response", status);
      } catch (error) {
        console.error("AI status error:", error);
        socket.emit("ai_status_error", {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
}

// Initialize AI event handlers when socket starts
function initializeAISocket() {
  if (ioInstance) {
    setupAIEventHandlers();
    console.log("🤖 AI Socket handlers initialized");
  }
}

function getAllSocketData() {
  if (!ioInstance) {
    console.warn("Socket.IO instance not initialized");
    return [];
  }

  const socketsData = [];

  ioInstance.sockets.sockets.forEach((socket) => {
    const socketInfo = {
      // Core identification
      id: socket.id,
      connected: socket.connected,
      disconnected: socket.disconnected,

      // User context
      userData: socket.userData || null,
      decodedToken: socket.decodedToken || null,

      // Network details
      handshake: {
        headers: socket.handshake.headers,
        time: socket.handshake.time,
        address: socket.handshake.address,
        xdomain: socket.handshake.xdomain,
        secure: socket.handshake.secure,
      },

      // Room membership
      rooms: Array.from(socket.rooms),

      // Operational state
      flags: {
        hasJoinedDefaultRoom: socket.rooms.has(socket.id), // Always true for default room
        isAuthenticated: !!socket.decodedToken,
      },

      // Timestamps
      connectedAt: socket.userData?.connectedAt || null,
      lastActivity: new Date(), // Current time as last activity proxy
    };

    socketsData.push(socketInfo);
  });

  return socketsData;
}

module.exports = {
  initializeSocket,
  sendToUid,
  sendToSocket,
  sendToAll,
  getConnectedUsers,
  getConnectionsByUid,
  getConnectionBySocketId,
  getAllSocketData,
  getSocketIo: () => ioInstance,
  // AI-enhanced functions
  broadcastAIUpdate,
  broadcastConversationUpdate,
  broadcastSheetsUpdate,
  broadcastAIStatus,
  initializeAISocket,
  setupAIEventHandlers,
};

// Initialize Phase 3 AI components
async function initializePhase3Components() {
  try {
    console.log("🔄 Initializing Phase 3 Real-time Intelligence components...");
    
    // Initialize Real-time Sheets Monitor
    if (realTimeSheetsMonitor && realTimeSheetsMonitor.initialize) {
      await realTimeSheetsMonitor.initialize();
      console.log("✅ Real-time Sheets Monitor initialized");
    }
    
    // Initialize Contextual Response Generator
    if (contextualResponseGenerator && contextualResponseGenerator.initialize) {
      await contextualResponseGenerator.initialize();
      console.log("✅ Contextual Response Generator initialized");
    }
    
    // Initialize Advanced Analytics
    if (advancedAnalytics && advancedAnalytics.initialize) {
      await advancedAnalytics.initialize();
      console.log("✅ Advanced Analytics initialized");
    }
    
    // Initialize Real-time Features
    if (realTimeFeatures && realTimeFeatures.initialize) {
      await realTimeFeatures.initialize();
      console.log("✅ Real-time Features initialized");
    }
    
    console.log("🎉 Phase 3 Real-time Intelligence components initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize Phase 3 components:", error);
    // Don't throw - allow system to continue with reduced functionality
  }
}

// Phase 3 Enhanced Broadcasting Functions
function broadcastAnalyticsUpdate(userId, analyticsData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast analytics update");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'analytics_update',
      data: analyticsData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('analytics_update', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('analytics_update', broadcastData);
    }
    
    console.log("📊 Analytics update broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast analytics update:", error);
  }
}

function broadcastRealTimeUpdate(userId, updateData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast real-time update");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'realtime_update',
      data: updateData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('realtime_update', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('realtime_update', broadcastData);
    }
    
    console.log("⚡ Real-time update broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast real-time update:", error);
  }
}

function broadcastPredictiveAlert(userId, alertData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast predictive alert");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'predictive_alert',
      data: alertData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('predictive_alert', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('predictive_alert', broadcastData);
    }
    
    console.log("🔮 Predictive alert broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast predictive alert:", error);
  }
}

function broadcastContextualResponse(userId, responseData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast contextual response");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'contextual_response',
      data: responseData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('contextual_response', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('contextual_response', broadcastData);
    }
    
    console.log("🎯 Contextual response broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast contextual response:", error);
  }
}

// Export Phase 3 functions
module.exports = {
  initializeSocket,
  sendToUid,
  sendToSocket,
  sendToAll,
  getConnectedUsers,
  getConnectionsByUid,
  getConnectionBySocketId,
  getAllSocketData,
  getSocketIo: () => ioInstance,
  // AI-enhanced functions
  broadcastAIUpdate,
  broadcastConversationUpdate,
  broadcastSheetsUpdate,
  broadcastAIStatus,
  initializeAISocket,
  setupAIEventHandlers,
  // Phase 3 enhanced functions
  broadcastAnalyticsUpdate,
  broadcastRealTimeUpdate,
  broadcastPredictiveAlert,
  broadcastContextualResponse,
  // Phase 4 functions
  broadcastDashboardUpdate,
  broadcastMobileNotification,
  broadcastOnboardingUpdate,
  broadcastAdvancedFeatureUpdate
};

// Initialize Phase 4 User Experience Overhaul components
async function initializePhase4Components() {
  try {
    console.log("🔄 Initializing Phase 4 User Experience Overhaul components...");
    
    // Initialize dashboard real-time features
    await initializeDashboardRealtime();
    console.log("✅ Dashboard real-time features initialized");
    
    // Initialize mobile push notifications
    await initializeMobileNotifications();
    console.log("✅ Mobile push notifications initialized");
    
    // Initialize onboarding progress tracking
    await initializeOnboardingTracking();
    console.log("✅ Onboarding progress tracking initialized");
    
    // Initialize advanced features monitoring
    await initializeAdvancedFeaturesMonitoring();
    console.log("✅ Advanced features monitoring initialized");
    
    console.log("🎉 Phase 4 User Experience Overhaul components initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize Phase 4 components:", error);
    // Don't throw - allow system to continue with reduced functionality
  }
}

// Phase 4 Broadcasting Functions
function broadcastDashboardUpdate(userId, dashboardData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast dashboard update");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'dashboard_update',
      data: dashboardData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('dashboard_update', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('dashboard_update', broadcastData);
    }
    
    console.log("📊 Dashboard update broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast dashboard update:", error);
  }
}

function broadcastMobileNotification(userId, notificationData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast mobile notification");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'mobile_notification',
      data: notificationData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('mobile_notification', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('mobile_notification', broadcastData);
    }
    
    console.log("📱 Mobile notification broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast mobile notification:", error);
  }
}

function broadcastOnboardingUpdate(userId, onboardingData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast onboarding update");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'onboarding_update',
      data: onboardingData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('onboarding_update', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('onboarding_update', broadcastData);
    }
    
    console.log("🎯 Onboarding update broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast onboarding update:", error);
  }
}

function broadcastAdvancedFeatureUpdate(userId, featureData) {
  if (!ioInstance) {
    console.warn("⚠️ Socket.IO not initialized - cannot broadcast advanced feature update");
    return;
  }
  
  try {
    const broadcastData = {
      type: 'advanced_feature_update',
      data: featureData,
      timestamp: new Date().toISOString(),
      userId
    };
    
    if (userId) {
      // Send to specific user
      ioInstance.to(`user_${userId}`).emit('advanced_feature_update', broadcastData);
    } else {
      // Send to all connected users
      ioInstance.emit('advanced_feature_update', broadcastData);
    }
    
    console.log("🚀 Advanced feature update broadcasted successfully");
  } catch (error) {
    console.error("❌ Failed to broadcast advanced feature update:", error);
  }
}

// Phase 4 Helper Functions
async function initializeDashboardRealtime() {
  // Initialize real-time dashboard features
  if (ioInstance) {
    ioInstance.on("connection", (socket) => {
      // Dashboard-specific event handlers
      socket.on("dashboard_subscribe", (data) => {
        const { userId, dashboardType } = data;
        socket.join(`dashboard_${userId}_${dashboardType}`);
        console.log(`📊 Socket ${socket.id} subscribed to dashboard ${dashboardType} for user ${userId}`);
      });
      
      socket.on("dashboard_unsubscribe", (data) => {
        const { userId, dashboardType } = data;
        socket.leave(`dashboard_${userId}_${dashboardType}`);
        console.log(`📊 Socket ${socket.id} unsubscribed from dashboard ${dashboardType} for user ${userId}`);
      });
    });
  }
}

async function initializeMobileNotifications() {
  // Initialize mobile push notification system
  if (ioInstance) {
    ioInstance.on("connection", (socket) => {
      // Mobile notification event handlers
      socket.on("mobile_register", (data) => {
        const { userId, deviceToken, platform } = data;
        socket.join(`mobile_${userId}`);
        console.log(`📱 Mobile device registered for user ${userId} on ${platform}`);
      });
      
      socket.on("mobile_unregister", (data) => {
        const { userId } = data;
        socket.leave(`mobile_${userId}`);
        console.log(`📱 Mobile device unregistered for user ${userId}`);
      });
    });
  }
}

async function initializeOnboardingTracking() {
  // Initialize onboarding progress tracking
  if (ioInstance) {
    ioInstance.on("connection", (socket) => {
      // Onboarding event handlers
      socket.on("onboarding_start", (data) => {
        const { userId, step } = data;
        socket.join(`onboarding_${userId}`);
        console.log(`🎯 Onboarding started for user ${userId} at step ${step}`);
      });
      
      socket.on("onboarding_step_complete", (data) => {
        const { userId, step, progress } = data;
        broadcastOnboardingUpdate(userId, { step, progress, status: 'completed' });
        console.log(`🎯 Onboarding step ${step} completed for user ${userId}`);
      });
    });
  }
}

async function initializeAdvancedFeaturesMonitoring() {
  // Initialize advanced features monitoring
  if (ioInstance) {
    ioInstance.on("connection", (socket) => {
      // Advanced features event handlers
      socket.on("advanced_feature_activate", (data) => {
        const { userId, featureId } = data;
        socket.join(`feature_${featureId}_${userId}`);
        console.log(`🚀 Advanced feature ${featureId} activated for user ${userId}`);
      });
      
      socket.on("advanced_feature_deactivate", (data) => {
        const { userId, featureId } = data;
        socket.leave(`feature_${featureId}_${userId}`);
        console.log(`🚀 Advanced feature ${featureId} deactivated for user ${userId}`);
      });
    });
  }
}
module.exports = {
  initializeSocket,
  sendToUid,
  sendToSocket,
  sendToAll,
  getConnectedUsers,
  getConnectionsByUid,
  getConnectionBySocketId,
  getAllSocketData,
  getSocketIo: () => ioInstance,
  // AI-enhanced functions
  broadcastAIUpdate,
  broadcastConversationUpdate,
  broadcastSheetsUpdate,
  broadcastAIStatus,
  // Phase 3 enhanced functions
  broadcastAnalyticsUpdate,
  broadcastRealTimeUpdate,
  broadcastPredictiveAlert,
  broadcastContextualResponse,
  initializePhase3Components,
};
