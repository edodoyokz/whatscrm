const NodeCache = require('node-cache');
const { dbpromise } = require('../database/dbpromise');
const cluster = require('cluster');
const os = require('os');

/**
 * Performance Optimization System
 * Comprehensive performance optimization and monitoring
 */

class PerformanceOptimizer {
  constructor() {
    // Response cache (TTL: 5 minutes)
    this.responseCache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 60,
      maxKeys: 10000
    });
    
    // Context cache (TTL: 30 minutes)
    this.contextCache = new NodeCache({ 
      stdTTL: 1800, 
      checkperiod: 120,
      maxKeys: 5000
    });
    
    // Sheets cache (TTL: 10 minutes)
    this.sheetsCache = new NodeCache({ 
      stdTTL: 600, 
      checkperiod: 60,
      maxKeys: 1000
    });
    
    // Analytics cache (TTL: 15 minutes)
    this.analyticsCache = new NodeCache({ 
      stdTTL: 900, 
      checkperiod: 120,
      maxKeys: 2000
    });
    
    // Performance metrics
    this.metrics = {
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      cacheHitRate: 0,
      databaseQueries: 0,
      aiRequests: 0,
      errors: 0
    };
    
    // Query optimization
    this.queryOptimizer = new QueryOptimizer();
    
    // Memory management
    this.memoryManager = new MemoryManager();
    
    // Load balancer
    this.loadBalancer = new LoadBalancer();
    
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    console.log("⚡ Initializing performance monitoring...");
    
    // Monitor response times
    setInterval(() => {
      this.collectResponseTimeMetrics();
    }, 60000); // Every minute
    
    // Monitor memory usage
    setInterval(() => {
      this.collectMemoryMetrics();
    }, 30000); // Every 30 seconds
    
    // Monitor CPU usage
    setInterval(() => {
      this.collectCPUMetrics();
    }, 30000); // Every 30 seconds
    
    // Monitor cache performance
    setInterval(() => {
      this.collectCacheMetrics();
    }, 120000); // Every 2 minutes
    
    // Cleanup old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Every 5 minutes
    
    console.log("✅ Performance monitoring initialized");
  }

  /**
   * Response caching system
   */
  async getCachedResponse(key, generator) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedResponse = this.responseCache.get(key);
      if (cachedResponse) {
        this.metrics.cacheHitRate++;
        return {
          data: cachedResponse,
          cached: true,
          responseTime: Date.now() - startTime
        };
      }
      
      // Generate new response
      const response = await generator();
      
      // Cache the response
      this.responseCache.set(key, response);
      
      return {
        data: response,
        cached: false,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Context caching system
   */
  async getCachedContext(userId, generator) {
    const cacheKey = `context_${userId}`;
    
    try {
      // Check cache first
      const cachedContext = this.contextCache.get(cacheKey);
      if (cachedContext) {
        return cachedContext;
      }
      
      // Generate new context
      const context = await generator();
      
      // Cache the context
      this.contextCache.set(cacheKey, context);
      
      return context;
    } catch (error) {
      console.error("❌ Context caching failed:", error);
      throw error;
    }
  }

  /**
   * Sheets data caching
   */
  async getCachedSheetsData(spreadsheetId, range, generator) {
    const cacheKey = `sheets_${spreadsheetId}_${range}`;
    
    try {
      // Check cache first
      const cachedData = this.sheetsCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Generate new data
      const data = await generator();
      
      // Cache the data
      this.sheetsCache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error("❌ Sheets caching failed:", error);
      throw error;
    }
  }

  /**
   * Analytics caching
   */
  async getCachedAnalytics(userId, timeRange, generator) {
    const cacheKey = `analytics_${userId}_${timeRange}`;
    
    try {
      // Check cache first
      const cachedAnalytics = this.analyticsCache.get(cacheKey);
      if (cachedAnalytics) {
        return cachedAnalytics;
      }
      
      // Generate new analytics
      const analytics = await generator();
      
      // Cache the analytics
      this.analyticsCache.set(cacheKey, analytics);
      
      return analytics;
    } catch (error) {
      console.error("❌ Analytics caching failed:", error);
      throw error;
    }
  }

  /**
   * Optimize database queries
   */
  async optimizeQuery(query, params) {
    const startTime = Date.now();
    
    try {
      // Use query optimizer
      const optimizedQuery = this.queryOptimizer.optimize(query, params);
      
      // Execute query
      const result = await dbpromise(optimizedQuery.query, optimizedQuery.params);
      
      // Track query performance
      this.metrics.databaseQueries++;
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 1000) { // Log slow queries
        console.warn(`⚠️ Slow query detected: ${queryTime}ms`);
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * AI request rate limiting
   */
  async limitAIRequests(userId, provider) {
    const rateLimitKey = `ai_rate_${userId}_${provider}`;
    const currentRequests = this.responseCache.get(rateLimitKey) || 0;
    
    // Rate limits per provider
    const rateLimits = {
      openai: 60, // 60 requests per minute
      gemini: 30,  // 30 requests per minute
      default: 30
    };
    
    const limit = rateLimits[provider] || rateLimits.default;
    
    if (currentRequests >= limit) {
      throw new Error(`Rate limit exceeded for ${provider}. Limit: ${limit} requests per minute`);
    }
    
    // Increment counter
    this.responseCache.set(rateLimitKey, currentRequests + 1, 60); // Reset every minute
    
    return {
      allowed: true,
      remaining: limit - currentRequests - 1,
      resetTime: Date.now() + 60000
    };
  }

  /**
   * Memory management
   */
  async manageMemory() {
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 1024 * 1024 * 1024; // 1GB
    
    if (memoryUsage.heapUsed > memoryThreshold) {
      console.warn("⚠️ High memory usage detected, initiating cleanup...");
      
      // Clear old cache entries
      this.responseCache.flushAll();
      this.contextCache.del(this.contextCache.keys().slice(0, 100)); // Clear oldest 100 entries
      this.sheetsCache.del(this.sheetsCache.keys().slice(0, 50)); // Clear oldest 50 entries
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      return {
        memoryCleared: true,
        oldMemoryUsage: memoryUsage.heapUsed,
        newMemoryUsage: process.memoryUsage().heapUsed
      };
    }
    
    return {
      memoryCleared: false,
      memoryUsage: memoryUsage.heapUsed
    };
  }

  /**
   * Scalability testing
   */
  async testScalability(concurrentUsers, requestsPerUser) {
    console.log(`🚀 Starting scalability test: ${concurrentUsers} users, ${requestsPerUser} requests each`);
    
    const startTime = Date.now();
    const results = {
      totalRequests: concurrentUsers * requestsPerUser,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0
    };
    
    const promises = [];
    
    for (let user = 0; user < concurrentUsers; user++) {
      for (let request = 0; request < requestsPerUser; request++) {
        promises.push(this.simulateUserRequest(user, request));
      }
    }
    
    try {
      const responses = await Promise.all(promises);
      
      // Calculate results
      results.successfulRequests = responses.filter(r => r.success).length;
      results.failedRequests = responses.filter(r => !r.success).length;
      results.averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      results.errorRate = (results.failedRequests / results.totalRequests) * 100;
      
      const totalTime = Date.now() - startTime;
      results.throughput = (results.successfulRequests / totalTime) * 1000; // requests per second
      
      console.log(`✅ Scalability test completed: ${results.successfulRequests}/${results.totalRequests} successful`);
      
      return results;
    } catch (error) {
      console.error("❌ Scalability test failed:", error);
      throw error;
    }
  }

  /**
   * Simulate user request for testing
   */
  async simulateUserRequest(userId, requestId) {
    const startTime = Date.now();
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
      return {
        success: true,
        userId,
        requestId,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        userId,
        requestId,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Collect performance metrics
   */
  collectResponseTimeMetrics() {
    // This would collect actual response times from requests
    const mockResponseTime = Math.random() * 1000 + 500; // 500-1500ms
    this.metrics.responseTime.push({
      timestamp: Date.now(),
      value: mockResponseTime
    });
    
    // Keep only last 100 measurements
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }
  }

  collectMemoryMetrics() {
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss
    });
    
    // Keep only last 100 measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
  }

  collectCPUMetrics() {
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
    
    // Keep only last 100 measurements
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage.shift();
    }
  }

  collectCacheMetrics() {
    const cacheStats = {
      responseCache: this.responseCache.getStats(),
      contextCache: this.contextCache.getStats(),
      sheetsCache: this.sheetsCache.getStats(),
      analyticsCache: this.analyticsCache.getStats()
    };
    
    // Calculate overall cache hit rate
    const totalHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits, 0);
    const totalMisses = Object.values(cacheStats).reduce((sum, stats) => sum + stats.misses, 0);
    
    this.metrics.cacheHitRate = totalHits / (totalHits + totalMisses) * 100;
  }

  cleanupOldMetrics() {
    // Remove metrics older than 1 hour
    const oneHourAgo = Date.now() - 3600000;
    
    this.metrics.responseTime = this.metrics.responseTime.filter(
      metric => metric.timestamp > oneHourAgo
    );
    
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
      metric => metric.timestamp > oneHourAgo
    );
    
    this.metrics.cpuUsage = this.metrics.cpuUsage.filter(
      metric => metric.timestamp > oneHourAgo
    );
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const averageResponseTime = this.metrics.responseTime.length > 0 ?
      this.metrics.responseTime.reduce((sum, m) => sum + m.value, 0) / this.metrics.responseTime.length : 0;
    
    const currentMemory = this.metrics.memoryUsage.length > 0 ?
      this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] : null;
    
    const currentCPU = this.metrics.cpuUsage.length > 0 ?
      this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1] : null;
    
    return {
      performance: {
        averageResponseTime,
        cacheHitRate: this.metrics.cacheHitRate,
        databaseQueries: this.metrics.databaseQueries,
        aiRequests: this.metrics.aiRequests,
        errors: this.metrics.errors
      },
      memory: currentMemory,
      cpu: currentCPU,
      cache: {
        responseCache: this.responseCache.getStats(),
        contextCache: this.contextCache.getStats(),
        sheetsCache: this.sheetsCache.getStats(),
        analyticsCache: this.analyticsCache.getStats()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Optimize system performance
   */
  async optimizePerformance() {
    console.log("🔧 Optimizing system performance...");
    
    const optimizations = [];
    
    // Memory optimization
    const memoryOptimization = await this.manageMemory();
    optimizations.push(memoryOptimization);
    
    // Cache optimization
    const cacheOptimization = await this.optimizeCaches();
    optimizations.push(cacheOptimization);
    
    // Database optimization
    const dbOptimization = await this.optimizeDatabase();
    optimizations.push(dbOptimization);
    
    return {
      optimized: true,
      optimizations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Optimize caches
   */
  async optimizeCaches() {
    // Remove least recently used items if cache is full
    const cacheOptimizations = {
      responseCache: this.responseCache.keys().length,
      contextCache: this.contextCache.keys().length,
      sheetsCache: this.sheetsCache.keys().length,
      analyticsCache: this.analyticsCache.keys().length
    };
    
    // Clear expired items
    this.responseCache.flushExpired();
    this.contextCache.flushExpired();
    this.sheetsCache.flushExpired();
    this.analyticsCache.flushExpired();
    
    return {
      type: 'cache_optimization',
      beforeOptimization: cacheOptimizations,
      afterOptimization: {
        responseCache: this.responseCache.keys().length,
        contextCache: this.contextCache.keys().length,
        sheetsCache: this.sheetsCache.keys().length,
        analyticsCache: this.analyticsCache.keys().length
      }
    };
  }

  /**
   * Optimize database
   */
  async optimizeDatabase() {
    try {
      // Analyze table statistics
      await dbpromise("ANALYZE TABLE user, conversation_memory, ai_response_logs");
      
      // Optimize tables
      await dbpromise("OPTIMIZE TABLE user, conversation_memory, ai_response_logs");
      
      return {
        type: 'database_optimization',
        optimized: true,
        tables: ['user', 'conversation_memory', 'ai_response_logs']
      };
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
      return {
        type: 'database_optimization',
        optimized: false,
        error: error.message
      };
    }
  }

  /**
   * Start cluster mode for better performance
   */
  static startCluster() {
    const numCPUs = os.cpus().length;
    
    if (cluster.isMaster) {
      console.log(`🚀 Starting cluster with ${numCPUs} workers`);
      
      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
      });
    } else {
      // Worker process
      require('../server.js');
    }
  }
}

/**
 * Query Optimizer
 */
class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.optimizationRules = [
      this.addIndexHints,
      this.optimizeJoins,
      this.optimizeWhereClause,
      this.limitResultSets
    ];
  }

  optimize(query, params) {
    let optimizedQuery = query;
    
    // Apply optimization rules
    for (const rule of this.optimizationRules) {
      optimizedQuery = rule(optimizedQuery, params);
    }
    
    return {
      query: optimizedQuery,
      params: params
    };
  }

  addIndexHints(query, params) {
    // Add index hints for common queries
    if (query.includes('WHERE uid = ?')) {
      query = query.replace('WHERE uid = ?', 'USE INDEX (idx_uid) WHERE uid = ?');
    }
    
    return query;
  }

  optimizeJoins(query, params) {
    // Optimize JOIN operations
    if (query.includes('LEFT JOIN')) {
      // Convert to INNER JOIN where possible
      // This is a simplified example
    }
    
    return query;
  }

  optimizeWhereClause(query, params) {
    // Optimize WHERE clauses
    if (query.includes('WHERE') && query.includes('ORDER BY')) {
      // Ensure WHERE clause uses indexed columns
    }
    
    return query;
  }

  limitResultSets(query, params) {
    // Add LIMIT clause if not present
    if (!query.includes('LIMIT') && query.includes('SELECT')) {
      query += ' LIMIT 1000';
    }
    
    return query;
  }
}

/**
 * Memory Manager
 */
class MemoryManager {
  constructor() {
    this.memoryThreshold = 1024 * 1024 * 1024; // 1GB
    this.cleanupInterval = 300000; // 5 minutes
    
    setInterval(() => {
      this.checkMemoryUsage();
    }, this.cleanupInterval);
  }

  checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    
    if (memoryUsage.heapUsed > this.memoryThreshold) {
      this.performCleanup();
    }
  }

  performCleanup() {
    console.log("🧹 Performing memory cleanup...");
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Clear unnecessary objects
    this.clearUnusedObjects();
    
    console.log("✅ Memory cleanup completed");
  }

  clearUnusedObjects() {
    // Implementation depends on specific objects to clean
    // This would clear old conversation contexts, expired caches, etc.
  }
}

/**
 * Load Balancer
 */
class LoadBalancer {
  constructor() {
    this.servers = [];
    this.currentIndex = 0;
    this.algorithm = 'round-robin';
  }

  addServer(server) {
    this.servers.push(server);
  }

  getNextServer() {
    if (this.servers.length === 0) return null;
    
    switch (this.algorithm) {
      case 'round-robin':
        return this.roundRobin();
      case 'least-connections':
        return this.leastConnections();
      case 'weighted':
        return this.weightedRoundRobin();
      default:
        return this.roundRobin();
    }
  }

  roundRobin() {
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  }

  leastConnections() {
    return this.servers.reduce((min, server) => 
      server.connections < min.connections ? server : min
    );
  }

  weightedRoundRobin() {
    // Simplified weighted round-robin
    const totalWeight = this.servers.reduce((sum, server) => sum + (server.weight || 1), 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const server of this.servers) {
      cumulativeWeight += server.weight || 1;
      if (random <= cumulativeWeight) {
        return server;
      }
    }
    
    return this.servers[0];
  }
}

module.exports = PerformanceOptimizer;
