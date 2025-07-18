require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const fileUpload = require("express-fileupload");
const { initCampaign } = require("./loops/campaignBeta.js");
const { runCampaign } = require("./loops/campaignLoop.js");
const nodeCleanup = require("node-cleanup");
const { init, cleanup } = require("./helper/addon/qr");

// Import optimization and security systems
const PerformanceOptimizer = require("./performance/performance_optimizer");
const SecurityManager = require("./security/security_manager");
const AITestingSuite = require("./testing/ai_testing_suite");

// Initialize systems
const performanceOptimizer = new PerformanceOptimizer();
const securityManager = new SecurityManager();
const aiTestingSuite = new AITestingSuite();

// Initialize security middleware
securityManager.initializeSecurityMiddleware(app);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// routers
const userRoute = require("./routes/user");
app.use("/api/user", userRoute);

const webRoute = require("./routes/web");
app.use("/api/web", webRoute);

const adminRoute = require("./routes/admin");
app.use("/api/admin", adminRoute);

const phonebookRoute = require("./routes/phonebook");
app.use("/api/phonebook", phonebookRoute);

const chat_flowRoute = require("./routes/chatFlow");
app.use("/api/chat_flow", chat_flowRoute);

const inboxRoute = require("./routes/inbox");
app.use("/api/inbox", inboxRoute);

const templetRoute = require("./routes/templet");
app.use("/api/templet", templetRoute);

const chatbotRoute = require("./routes/chatbot");
app.use("/api/chatbot", chatbotRoute);

const broadcastRoute = require("./routes/broadcast");
app.use("/api/broadcast", broadcastRoute);

const apiRoute = require("./routes/apiv2");
app.use("/api/v1", apiRoute);

const agentRoute = require("./routes/agent");
app.use("/api/agent", agentRoute);

const qrRoute = require("./routes/qr");
app.use("/api/qr", qrRoute);

const aiRoute = require("./routes/ai");
app.use("/api/ai", aiRoute);

// Enhanced AI Routes
const aiEnhancedRoute = require("./routes/ai_enhanced");
app.use("/api/ai-enhanced", aiEnhancedRoute);

// AI Testing Routes (Phase 2)
const aiTestingRoute = require("./routes/ai_testing");
app.use("/api/ai-testing", aiTestingRoute);

// Phase 3 Real-time Intelligence Routes
const aiRealtimeRoute = require("./routes/ai_realtime");
app.use("/api/ai-realtime", aiRealtimeRoute);

// Phase 4 User Experience Overhaul Routes
const dashboardRoute = require("./routes/dashboard");
app.use("/api/dashboard", dashboardRoute);

const onboardingRoute = require("./routes/onboarding");
app.use("/api/onboarding", onboardingRoute);

const advancedFeaturesRoute = require("./routes/advanced_features");
app.use("/api/advanced-features", advancedFeaturesRoute);

const mobileRoute = require("./routes/mobile");
app.use("/api/mobile", mobileRoute);

// Additional System Routes
app.get("/api/performance/report", async (req, res) => {
  try {
    const report = performanceOptimizer.getPerformanceReport();
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/performance/optimize", async (req, res) => {
  try {
    const result = await performanceOptimizer.optimizePerformance();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/testing/run-all", async (req, res) => {
  try {
    const results = await aiTestingSuite.runAllTests();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/security/gdpr-request", async (req, res) => {
  try {
    const { userId, requestType, details } = req.body;
    const result = await securityManager.handleGDPRRequest(userId, requestType, details);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/system/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: performanceOptimizer.getPerformanceReport(),
    version: "4.0.0"
  };
  res.json(health);
});

const path = require("path");
const { warmerLoopInit } = require("./helper/addon/qr/warmer/index.js");

const currentDir = process.cwd();

app.use(express.static(path.resolve(currentDir, "./client/public")));

app.get("*", function (request, response) {
  response.sendFile(path.resolve(currentDir, "./client/public", "index.html"));
});

const server = app.listen(process.env.PORT || 3010, () => {
  console.log(`🎉 AI-Powered WaCrm server is running on port ${process.env.PORT || 3010}`);
  console.log(`🔗 Health check: http://localhost:${process.env.PORT || 3010}/api/system/health`);
  console.log(`📊 Performance report: http://localhost:${process.env.PORT || 3010}/api/performance/report`);
  console.log(`🧪 Testing suite: http://localhost:${process.env.PORT || 3010}/api/testing/run-all`);
  init();
  setTimeout(() => {
    runCampaign();
    warmerLoopInit();
    initCampaign();
  }, 1000);
});

// Initialize Socket.IO after server is running
const io = require("./socket").initializeSocket(server);
module.exports = io;

nodeCleanup(cleanup);
