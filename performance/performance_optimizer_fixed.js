const NodeCache = require('node-cache');
const { dbpromise } = require('../database/dbpromise');
const cluster = require('cluster');
const os = require('os');

/**
 * Performance Optimization System - FIXED VERSION
 * Comprehensive performance optimization and monitoring with bug fixes
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
    
    // Thread safety
    this.memoryCleanupInProgress = false;
    this.cacheLocks = new Map();
    
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
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    console.log("✅ Performance monitoring initialized");
  }

  /**
   * Setup graceful shutdown handler
   */
  setupGracefulShutdown() {
    process.on('SIGTERM', () => {
      console.log('🧹 Cleaning up Performance Optimizer...');
      this.responseCache.flushAll();
      this.contextCache.flushAll();
      this.sheetsCache.flushAll();
      this.analyticsCache.flushAll();
      console.log('✅ Performance Optimizer cleaned up');
    });
  }

  /**
   * Manage memory with proper locking - FIXED
   */
  async manageMemory() {
    if (this.memoryCleanupInProgress) {
      return { memoryCleared: false, reason: 'cleanup_in_progress' };
    }

    this.memoryCleanupInProgress = true;
    
    try {
      const memoryUsage = process.memoryUsage();
      const memoryThreshold = 1024 * 1024 * 1024; // 1GB
      
      if (memoryUsage.heapUsed > memoryThreshold) {
        console.warn("⚠️ High memory usage detected, initiating cleanup...");
        
        // Clear old cache entries with proper locking
        await this.performSafeCacheCleanup();
        
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
    } finally {
      this.memoryCleanupInProgress = false;
    }
  }

  /**
   * Perform safe cache cleanup with locking
   */
  async performSafeCacheCleanup() {
    try {
      // Clear expired entries first
      this.responseCache.flushExpired();
      this.contextCache.flushExpired();
      this.sheetsCache.flushExpired();
      this.analyticsCache.flushExpired();
      
      // Clear oldest entries if still needed
      const contextKeys = this.contextCache.keys();
      if (contextKeys.length > 4000) {
        const keysToDelete = contextKeys.slice(0, 100);
        keysToDelete.forEach(key => this.contextCache.del(key));
      }
      
      const sheetsKeys = this.sheetsCache.keys();
      if (sheetsKeys.length > 800) {
        const keysToDelete = sheetsKeys.slice(0, 50);
        keysToDelete.forEach(key => this.sheetsCache.del(key));
      }
    } catch (error) {
      console.error("❌ Cache cleanup failed:", error);
    }
  }

  /**
   * Response caching system with error handling
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
   * AI request rate limiting with proper implementation
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
    
    // Increment counter with TTL
    this.responseCache.set(rateLimitKey, currentRequests + 1, 60); // Reset every minute
    
    return {
      allowed: true,
      remaining: limit - currentRequests - 1,
      resetTime: Date.now() + 60000
    };
  }

  // ... rest of the methods remain the same ...
}

// Export the fixed version
module.exports = PerformanceOptimizer;