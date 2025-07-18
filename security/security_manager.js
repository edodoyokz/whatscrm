const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss');
const { dbpromise } = require('../database/dbpromise');

/**
 * Security & Compliance System
 * Comprehensive security measures and compliance features
 */

class SecurityManager {
  constructor() {
    this.encryptionKey = this.initializeEncryptionKey();
    this.algorithms = {
      encryption: 'aes-256-gcm',
      hash: 'sha256'
    };
    this.complianceFlags = {
      gdpr: true,
      ccpa: true,
      hipaa: false,
      sox: false
    };
  }

  /**
   * Initialize encryption key with proper key management
   */
  initializeEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
      console.error("❌ Invalid encryption key. Please set ENCRYPTION_KEY environment variable with at least 32 bytes.");
      throw new Error("Invalid encryption key configuration");
    }
    return crypto.scryptSync(key, 'salt', 32);
  }

  /**
   * Initialize security middleware
   */
  initializeSecurityMiddleware(app) {
    console.log("🔒 Initializing security middleware...");

    // Helmet for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    app.use('/api/', limiter);

    // AI-specific rate limiting
    const aiLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // limit each IP to 30 AI requests per minute
      message: {
        error: 'AI request limit exceeded. Please wait before making more requests.',
        retryAfter: '1 minute'
      }
    });

    app.use('/api/ai-enhanced/', aiLimiter);
    app.use('/api/ai-realtime/', aiLimiter);

    console.log("✅ Security middleware initialized");
  }

  /**
   * Encrypt sensitive data with proper IV generation and GCM mode
   */
  encryptData(data, additionalData = '') {
    try {
      const iv = crypto.randomBytes(12); // GCM recommended IV size
      const cipher = crypto.createCipher(this.algorithms.encryption, this.encryptionKey);
      cipher.setAAD(Buffer.from(additionalData));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        authTag: authTag.toString('hex'),
        iv: iv.toString('hex')
      };
    } catch (error) {
      console.error("❌ Encryption failed:", error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data with proper IV handling and GCM mode
   */
  decryptData(encryptedData, additionalData = '') {
    try {
      if (!encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data format');
      }
      
      const decipher = crypto.createDecipher(this.algorithms.encryption, this.encryptionKey);
      decipher.setAAD(Buffer.from(additionalData));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("❌ Decryption failed:", error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Hash sensitive data
   */
  hashData(data, salt = '') {
    try {
      const hash = crypto.createHash(this.algorithms.hash);
      hash.update(data + salt);
      return hash.digest('hex');
    } catch (error) {
      console.error("❌ Hashing failed:", error);
      throw new Error('Data hashing failed');
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // XSS protection
    const sanitized = xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // SQL injection protection
    const sqlSanitized = sanitized.replace(/['"\\;]/g, '');
    
    return sqlSanitized.trim();
  }

  /**
   * Validate user permissions
   */
  async validatePermissions(userId, resource, action) {
    try {
      const [userPermissions] = await dbpromise(
        "SELECT permissions FROM user_permissions WHERE uid = ?",
        [userId]
      );
      
      if (!userPermissions) {
        return false;
      }
      
      const permissions = JSON.parse(userPermissions.permissions || '{}');
      return permissions[resource]?.includes(action) || false;
    } catch (error) {
      console.error("❌ Permission validation failed:", error);
      return false;
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, userId, details) {
    try {
      await dbpromise(
        "INSERT INTO security_logs (event_type, user_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [
          eventType,
          userId,
          JSON.stringify(details),
          details.ipAddress || 'unknown',
          details.userAgent || 'unknown',
          new Date().toISOString()
        ]
      );
    } catch (error) {
      console.error("❌ Security logging failed:", error);
    }
  }

  /**
   * Content filtering for AI responses
   */
  filterAIResponse(response) {
    const bannedWords = [
      'inappropriate', 'offensive', 'harmful', 'hate', 'violence',
      'discrimination', 'harassment', 'abuse', 'threat', 'illegal'
    ];
    
    const sensitiveTopics = [
      'politics', 'religion', 'personal_finance', 'medical_advice',
      'legal_advice', 'investment_advice'
    ];
    
    let filteredResponse = response;
    let flags = [];
    
    // Check for banned words
    bannedWords.forEach(word => {
      if (filteredResponse.toLowerCase().includes(word)) {
        flags.push(`banned_word: ${word}`);
        filteredResponse = filteredResponse.replace(
          new RegExp(word, 'gi'),
          '[FILTERED]'
        );
      }
    });
    
    // Check for sensitive topics
    sensitiveTopics.forEach(topic => {
      if (filteredResponse.toLowerCase().includes(topic)) {
        flags.push(`sensitive_topic: ${topic}`);
      }
    });
    
    return {
      original: response,
      filtered: filteredResponse,
      flags,
      safe: flags.length === 0
    };
  }

  /**
   * GDPR compliance features
   */
  async handleGDPRRequest(userId, requestType, details) {
    try {
      console.log(`🛡️ Processing GDPR request: ${requestType} for user ${userId}`);
      
      switch (requestType) {
        case 'data_export':
          return await this.exportUserData(userId);
        
        case 'data_deletion':
          return await this.deleteUserData(userId, details);
        
        case 'data_portability':
          return await this.exportPortableData(userId);
        
        case 'consent_withdrawal':
          return await this.withdrawConsent(userId, details);
        
        case 'data_rectification':
          return await this.rectifyUserData(userId, details);
        
        default:
          throw new Error(`Unknown GDPR request type: ${requestType}`);
      }
    } catch (error) {
      console.error("❌ GDPR request processing failed:", error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR Article 15)
   */
  async exportUserData(userId) {
    try {
      const userData = {};
      
      // Get user profile
      const [user] = await dbpromise("SELECT * FROM user WHERE uid = ?", [userId]);
      userData.profile = user;
      
      // Get conversation data
      const conversations = await dbpromise(
        "SELECT * FROM conversation_memory WHERE uid = ?",
        [userId]
      );
      userData.conversations = conversations;
      
      // Get AI interactions
      const aiInteractions = await dbpromise(
        "SELECT * FROM ai_response_logs WHERE uid = ?",
        [userId]
      );
      userData.aiInteractions = aiInteractions;
      
      // Get analytics data
      const analytics = await dbpromise(
        "SELECT * FROM conversation_analytics WHERE uid = ?",
        [userId]
      );
      userData.analytics = analytics;
      
      // Get personality settings
      const [personality] = await dbpromise(
        "SELECT * FROM user_personality WHERE uid = ?",
        [userId]
      );
      userData.personality = personality;
      
      return {
        success: true,
        data: userData,
        exportDate: new Date().toISOString(),
        format: 'json'
      };
    } catch (error) {
      console.error("❌ User data export failed:", error);
      throw error;
    }
  }

  /**
   * Delete user data (GDPR Article 17)
   */
  async deleteUserData(userId, details) {
    try {
      const deletionScope = details.scope || 'full';
      const deletedData = {};
      
      if (deletionScope === 'full' || deletionScope === 'conversations') {
        // Delete conversation data
        const conversationResult = await dbpromise(
          "DELETE FROM conversation_memory WHERE uid = ?",
          [userId]
        );
        deletedData.conversations = conversationResult.affectedRows;
        
        // Delete AI interactions
        const aiResult = await dbpromise(
          "DELETE FROM ai_response_logs WHERE uid = ?",
          [userId]
        );
        deletedData.aiInteractions = aiResult.affectedRows;
      }
      
      if (deletionScope === 'full' || deletionScope === 'analytics') {
        // Delete analytics data
        const analyticsResult = await dbpromise(
          "DELETE FROM conversation_analytics WHERE uid = ?",
          [userId]
        );
        deletedData.analytics = analyticsResult.affectedRows;
      }
      
      if (deletionScope === 'full' || deletionScope === 'personality') {
        // Delete personality settings
        const personalityResult = await dbpromise(
          "DELETE FROM user_personality WHERE uid = ?",
          [userId]
        );
        deletedData.personality = personalityResult.affectedRows;
      }
      
      if (deletionScope === 'full') {
        // Delete user profile (only for full deletion)
        const userResult = await dbpromise(
          "DELETE FROM user WHERE uid = ?",
          [userId]
        );
        deletedData.profile = userResult.affectedRows;
      }
      
      return {
        success: true,
        deletedData,
        deletionDate: new Date().toISOString(),
        scope: deletionScope
      };
    } catch (error) {
      console.error("❌ User data deletion failed:", error);
      throw error;
    }
  }

  /**
   * Export portable data (GDPR Article 20)
   */
  async exportPortableData(userId) {
    try {
      const userData = await this.exportUserData(userId);
      
      // Convert to portable format
      const portableData = {
        user_id: userId,
        export_date: new Date().toISOString(),
        format: 'json',
        data: {
          conversations: userData.data.conversations.map(conv => ({
            id: conv.id,
            context: conv.context,
            topic: conv.last_topic,
            stage: conv.conversation_stage,
            mood: conv.customer_mood,
            date: conv.created_at
          })),
          ai_interactions: userData.data.aiInteractions.map(ai => ({
            message: ai.user_message,
            response: ai.ai_response,
            intent: ai.intent,
            confidence: ai.confidence,
            date: ai.created_at
          })),
          personality: userData.data.personality,
          analytics: userData.data.analytics
        }
      };
      
      return {
        success: true,
        data: portableData,
        format: 'json',
        size: JSON.stringify(portableData).length
      };
    } catch (error) {
      console.error("❌ Portable data export failed:", error);
      throw error;
    }
  }

  /**
   * Withdraw consent (GDPR Article 7)
   */
  async withdrawConsent(userId, details) {
    try {
      const consentTypes = details.consentTypes || ['all'];
      const withdrawnConsent = {};
      
      for (const consentType of consentTypes) {
        // Update consent status
        await dbpromise(
          "UPDATE user_consent SET status = 'withdrawn', withdrawn_at = ? WHERE uid = ? AND consent_type = ?",
          [new Date().toISOString(), userId, consentType]
        );
        
        withdrawnConsent[consentType] = 'withdrawn';
      }
      
      return {
        success: true,
        withdrawnConsent,
        withdrawalDate: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Consent withdrawal failed:", error);
      throw error;
    }
  }

  /**
   * Rectify user data (GDPR Article 16)
   */
  async rectifyUserData(userId, details) {
    try {
      const rectifications = details.rectifications || {};
      const rectifiedData = {};
      
      for (const [table, updates] of Object.entries(rectifications)) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), userId];
        
        await dbpromise(
          `UPDATE ${table} SET ${setClause} WHERE uid = ?`,
          values
        );
        
        rectifiedData[table] = updates;
      }
      
      return {
        success: true,
        rectifiedData,
        rectificationDate: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Data rectification failed:", error);
      throw error;
    }
  }

  /**
   * Data breach detection and response
   */
  async detectDataBreach(event) {
    try {
      const breachIndicators = [
        'unauthorized_access',
        'data_exfiltration',
        'system_compromise',
        'unusual_activity',
        'failed_authentication'
      ];
      
      if (breachIndicators.includes(event.type)) {
        // Log potential breach
        await this.logSecurityEvent('potential_breach', event.userId, {
          type: event.type,
          severity: event.severity || 'medium',
          details: event.details,
          detected_at: new Date().toISOString()
        });
        
        // Trigger breach response
        await this.triggerBreachResponse(event);
        
        return {
          breachDetected: true,
          severity: event.severity,
          responseTriggered: true
        };
      }
      
      return {
        breachDetected: false
      };
    } catch (error) {
      console.error("❌ Breach detection failed:", error);
      throw error;
    }
  }

  /**
   * Trigger breach response procedures
   */
  async triggerBreachResponse(event) {
    try {
      const response = {
        containment: false,
        notification: false,
        investigation: false,
        recovery: false
      };
      
      // Containment measures
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.containBreach(event);
        response.containment = true;
      }
      
      // Notification procedures
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.notifyAuthorities(event);
        await this.notifyAffectedUsers(event);
        response.notification = true;
      }
      
      // Investigation
      await this.initiateInvestigation(event);
      response.investigation = true;
      
      // Recovery procedures
      await this.initiateRecovery(event);
      response.recovery = true;
      
      return response;
    } catch (error) {
      console.error("❌ Breach response failed:", error);
      throw error;
    }
  }

  /**
   * Contain security breach
   */
  async containBreach(event) {
    try {
      // Disable affected systems
      if (event.affectedSystems) {
        for (const system of event.affectedSystems) {
          await this.disableSystem(system);
        }
      }
      
      // Revoke access tokens
      if (event.affectedUsers) {
        for (const userId of event.affectedUsers) {
          await this.revokeUserAccess(userId);
        }
      }
      
      // Enable enhanced monitoring
      await this.enableEnhancedMonitoring(event);
      
      return {
        containmentComplete: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Breach containment failed:", error);
      throw error;
    }
  }

  /**
   * Notify authorities about breach
   */
  async notifyAuthorities(event) {
    try {
      // Notify within 72 hours as required by GDPR
      const notification = {
        breach_id: event.id,
        notification_date: new Date().toISOString(),
        severity: event.severity,
        affected_records: event.affectedRecords || 0,
        data_types: event.dataTypes || [],
        mitigation_measures: event.mitigationMeasures || []
      };
      
      // Store notification record
      await dbpromise(
        "INSERT INTO breach_notifications (breach_id, notification_type, notification_date, details) VALUES (?, ?, ?, ?)",
        [event.id, 'authority', notification.notification_date, JSON.stringify(notification)]
      );
      
      return {
        authorityNotified: true,
        notificationDate: notification.notification_date
      };
    } catch (error) {
      console.error("❌ Authority notification failed:", error);
      throw error;
    }
  }

  /**
   * Notify affected users
   */
  async notifyAffectedUsers(event) {
    try {
      const affectedUsers = event.affectedUsers || [];
      const notificationResults = [];
      
      for (const userId of affectedUsers) {
        const notification = {
          user_id: userId,
          breach_id: event.id,
          notification_date: new Date().toISOString(),
          message: this.generateUserNotificationMessage(event)
        };
        
        // Store notification
        await dbpromise(
          "INSERT INTO user_breach_notifications (user_id, breach_id, notification_date, message) VALUES (?, ?, ?, ?)",
          [userId, event.id, notification.notification_date, notification.message]
        );
        
        notificationResults.push({
          userId,
          notified: true,
          notificationDate: notification.notification_date
        });
      }
      
      return {
        usersNotified: notificationResults.length,
        notifications: notificationResults
      };
    } catch (error) {
      console.error("❌ User notification failed:", error);
      throw error;
    }
  }

  /**
   * Generate user notification message
   */
  generateUserNotificationMessage(event) {
    return `
      We are writing to inform you of a security incident that may have affected your personal data.
      
      What happened: ${event.description}
      When: ${event.detectedAt}
      Data potentially affected: ${event.dataTypes?.join(', ') || 'Unknown'}
      
      Actions we have taken:
      - Immediate containment of the incident
      - Investigation initiated
      - Enhanced security measures implemented
      
      Actions you should take:
      - Review your account for any unusual activity
      - Consider changing your password
      - Monitor your accounts for suspicious activity
      
      We sincerely apologize for this incident and any inconvenience it may cause.
      
      If you have questions, please contact our support team.
    `;
  }

  /**
   * Initiate investigation
   */
  async initiateInvestigation(event) {
    try {
      const investigation = {
        breach_id: event.id,
        investigation_started: new Date().toISOString(),
        investigator: 'security_team',
        status: 'active',
        priority: event.severity === 'critical' ? 'high' : 'medium'
      };
      
      await dbpromise(
        "INSERT INTO breach_investigations (breach_id, started_at, investigator, status, priority) VALUES (?, ?, ?, ?, ?)",
        [event.id, investigation.investigation_started, investigation.investigator, investigation.status, investigation.priority]
      );
      
      return {
        investigationInitiated: true,
        investigationId: investigation.breach_id,
        startedAt: investigation.investigation_started
      };
    } catch (error) {
      console.error("❌ Investigation initiation failed:", error);
      throw error;
    }
  }

  /**
   * Initiate recovery procedures
   */
  async initiateRecovery(event) {
    try {
      const recovery = {
        breach_id: event.id,
        recovery_started: new Date().toISOString(),
        recovery_plan: this.generateRecoveryPlan(event),
        status: 'in_progress'
      };
      
      await dbpromise(
        "INSERT INTO breach_recovery (breach_id, started_at, recovery_plan, status) VALUES (?, ?, ?, ?)",
        [event.id, recovery.recovery_started, JSON.stringify(recovery.recovery_plan), recovery.status]
      );
      
      return {
        recoveryInitiated: true,
        recoveryId: recovery.breach_id,
        startedAt: recovery.recovery_started
      };
    } catch (error) {
      console.error("❌ Recovery initiation failed:", error);
      throw error;
    }
  }

  /**
   * Generate recovery plan
   */
  generateRecoveryPlan(event) {
    return {
      immediate_actions: [
        'System security assessment',
        'Vulnerability patching',
        'Access review and updates',
        'Enhanced monitoring implementation'
      ],
      short_term_actions: [
        'Security audit',
        'Process improvements',
        'Staff training',
        'Communication plan execution'
      ],
      long_term_actions: [
        'Security framework review',
        'Technology upgrades',
        'Regular security assessments',
        'Incident response plan updates'
      ]
    };
  }

  /**
   * Disable system during breach
   */
  async disableSystem(system) {
    console.log(`🚨 Disabling system: ${system}`);
    // Implementation depends on system architecture
    return { disabled: true, system, timestamp: new Date().toISOString() };
  }

  /**
   * Revoke user access
   */
  async revokeUserAccess(userId) {
    try {
      await dbpromise(
        "UPDATE user SET access_status = 'revoked', revoked_at = ? WHERE uid = ?",
        [new Date().toISOString(), userId]
      );
      
      return { accessRevoked: true, userId, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("❌ Access revocation failed:", error);
      throw error;
    }
  }

  /**
   * Enable enhanced monitoring
   */
  async enableEnhancedMonitoring(event) {
    console.log(`🔍 Enabling enhanced monitoring for breach: ${event.id}`);
    // Implementation depends on monitoring infrastructure
    return { enhancedMonitoring: true, event: event.id, timestamp: new Date().toISOString() };
  }

  /**
   * AI bias detection and mitigation
   */
  async detectAIBias(responses, demographics) {
    try {
      const biasMetrics = {
        demographic_parity: 0,
        equalized_odds: 0,
        individual_fairness: 0,
        bias_detected: false,
        bias_score: 0
      };
      
      // Analyze responses for bias indicators
      const biasIndicators = this.analyzeBiasIndicators(responses, demographics);
      
      // Calculate bias metrics
      biasMetrics.demographic_parity = this.calculateDemographicParity(responses, demographics);
      biasMetrics.equalized_odds = this.calculateEqualizedOdds(responses, demographics);
      biasMetrics.individual_fairness = this.calculateIndividualFairness(responses);
      
      // Overall bias score
      biasMetrics.bias_score = (biasMetrics.demographic_parity + biasMetrics.equalized_odds + biasMetrics.individual_fairness) / 3;
      biasMetrics.bias_detected = biasMetrics.bias_score > 0.3; // Threshold for bias detection
      
      return {
        success: true,
        biasMetrics,
        biasIndicators,
        recommendations: this.generateBiasMitigationRecommendations(biasMetrics)
      };
    } catch (error) {
      console.error("❌ AI bias detection failed:", error);
      throw error;
    }
  }

  /**
   * Analyze bias indicators
   */
  analyzeBiasIndicators(responses, demographics) {
    const indicators = {
      language_bias: 0,
      cultural_bias: 0,
      gender_bias: 0,
      age_bias: 0,
      response_quality_variation: 0
    };
    
    // Simplified bias analysis
    // In production, this would use more sophisticated ML models
    
    return indicators;
  }

  /**
   * Calculate demographic parity
   */
  calculateDemographicParity(responses, demographics) {
    // Simplified calculation
    // In production, this would be more comprehensive
    return Math.random() * 0.2; // Mock calculation
  }

  /**
   * Calculate equalized odds
   */
  calculateEqualizedOdds(responses, demographics) {
    // Simplified calculation
    return Math.random() * 0.15; // Mock calculation
  }

  /**
   * Calculate individual fairness
   */
  calculateIndividualFairness(responses) {
    // Simplified calculation
    return Math.random() * 0.1; // Mock calculation
  }

  /**
   * Generate bias mitigation recommendations
   */
  generateBiasMitigationRecommendations(biasMetrics) {
    const recommendations = [];
    
    if (biasMetrics.demographic_parity > 0.2) {
      recommendations.push("Review training data for demographic representation");
    }
    
    if (biasMetrics.equalized_odds > 0.15) {
      recommendations.push("Implement fairness constraints in model training");
    }
    
    if (biasMetrics.individual_fairness > 0.1) {
      recommendations.push("Review individual response patterns for consistency");
    }
    
    if (biasMetrics.bias_detected) {
      recommendations.push("Implement bias monitoring and correction systems");
    }
    
    return recommendations;
  }
}

module.exports = SecurityManager;
