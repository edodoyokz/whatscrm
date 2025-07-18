const { google } = require('googleapis');
const { dbpromise } = require("../database/dbpromise");
const { broadcastSheetsUpdate } = require("../socket");

/**
 * Real-time Google Sheets Monitor
 * Monitors Google Sheets for changes and updates AI knowledge in real-time
 */
class RealTimeSheetsMonitor {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.monitoredSheets = new Map();
        this.pollInterval = 30000; // 30 seconds
        this.initialized = false;
        this.changeDetectors = new Map();
        this.lastChecked = new Map();
    }

    /**
     * Initialize the real-time monitor
     */
    async initialize() {
        try {
            console.log("📊 Initializing Real-time Sheets Monitor...");
            
            // Initialize Google Sheets API
            await this.initializeGoogleSheets();
            
            // Load monitored sheets from database
            await this.loadMonitoredSheets();
            
            // Start monitoring
            this.startMonitoring();
            
            this.initialized = true;
            console.log("✅ Real-time Sheets Monitor initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Real-time Sheets Monitor:", error);
            throw error;
        }
    }

    /**
     * Initialize Google Sheets API
     */
    async initializeGoogleSheets() {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
            
            this.auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });
            
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            
            console.log("✅ Google Sheets API initialized");
        } catch (error) {
            console.error("❌ Failed to initialize Google Sheets API:", error);
            throw error;
        }
    }

    /**
     * Load monitored sheets from database
     */
    async loadMonitoredSheets() {
        try {
            const query = `
                SELECT * FROM ai_knowledge_cache 
                WHERE data_source = 'google_sheets' 
                AND is_active = 1
            `;
            
            const [rows] = await dbpromise.execute(query);
            
            for (const row of rows) {
                const config = JSON.parse(row.configuration || '{}');
                this.monitoredSheets.set(row.cache_key, {
                    id: row.id,
                    userId: row.user_id,
                    spreadsheetId: config.spreadsheetId,
                    sheetName: config.sheetName,
                    range: config.range,
                    dataType: config.dataType,
                    lastHash: row.data_hash,
                    lastUpdate: row.last_update,
                    configuration: config
                });
            }
            
            console.log(`📋 Loaded ${this.monitoredSheets.size} monitored sheets`);
        } catch (error) {
            console.error("❌ Failed to load monitored sheets:", error);
            throw error;
        }
    }

    /**
     * Start monitoring sheets for changes
     */
    startMonitoring() {
        console.log("👀 Starting real-time monitoring...");
        
        // Initial check
        this.checkAllSheets();
        
        // Set up periodic monitoring
        this.monitorInterval = setInterval(() => {
            this.checkAllSheets();
        }, this.pollInterval);
    }

    /**
     * Check all monitored sheets for changes
     */
    async checkAllSheets() {
        try {
            const promises = Array.from(this.monitoredSheets.entries()).map(
                ([key, sheetConfig]) => this.checkSheetChanges(key, sheetConfig)
            );
            
            await Promise.all(promises);
        } catch (error) {
            console.error("❌ Error checking sheets:", error);
        }
    }

    /**
     * Check specific sheet for changes
     */
    async checkSheetChanges(cacheKey, sheetConfig) {
        try {
            const { spreadsheetId, sheetName, range, userId } = sheetConfig;
            
            // Get current data
            const currentData = await this.fetchSheetData(spreadsheetId, sheetName, range);
            
            // Calculate hash
            const currentHash = this.calculateDataHash(currentData);
            
            // Check if data changed
            if (currentHash !== sheetConfig.lastHash) {
                console.log(`📊 Change detected in sheet: ${cacheKey}`);
                
                // Process the change
                await this.processSheetChange(cacheKey, sheetConfig, currentData, currentHash);
                
                // Update monitoring config
                sheetConfig.lastHash = currentHash;
                sheetConfig.lastUpdate = new Date();
                
                // Broadcast change to connected clients
                broadcastSheetsUpdate(userId, {
                    cacheKey,
                    data: currentData,
                    timestamp: new Date().toISOString(),
                    changeType: 'data_updated'
                });
            }
        } catch (error) {
            console.error(`❌ Error checking sheet ${cacheKey}:`, error);
        }
    }

    /**
     * Fetch data from Google Sheets
     */
    async fetchSheetData(spreadsheetId, sheetName, range) {
        try {
            const fullRange = sheetName ? `${sheetName}!${range}` : range;
            
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: fullRange,
                valueRenderOption: 'FORMATTED_VALUE',
                dateTimeRenderOption: 'FORMATTED_STRING'
            });
            
            return response.data.values || [];
        } catch (error) {
            console.error("❌ Failed to fetch sheet data:", error);
            throw error;
        }
    }

    /**
     * Calculate hash for data change detection
     */
    calculateDataHash(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Process sheet change and update cache
     */
    async processSheetChange(cacheKey, sheetConfig, newData, newHash) {
        try {
            // Validate data
            const validatedData = await this.validateSheetData(newData, sheetConfig);
            
            // Interpret data intelligently
            const interpretedData = await this.interpretSheetData(validatedData, sheetConfig);
            
            // Update database cache
            await this.updateKnowledgeCache(sheetConfig.id, interpretedData, newHash);
            
            // Log the change
            await this.logSheetChange(cacheKey, sheetConfig, interpretedData);
            
            console.log(`✅ Updated cache for sheet: ${cacheKey}`);
        } catch (error) {
            console.error(`❌ Failed to process sheet change for ${cacheKey}:`, error);
        }
    }

    /**
     * Validate sheet data
     */
    async validateSheetData(data, sheetConfig) {
        try {
            const { dataType, configuration } = sheetConfig;
            
            // Basic validation
            if (!data || data.length === 0) {
                throw new Error("Sheet data is empty");
            }
            
            // Type-specific validation
            switch (dataType) {
                case 'products':
                    return this.validateProductData(data, configuration);
                case 'services':
                    return this.validateServiceData(data, configuration);
                case 'inventory':
                    return this.validateInventoryData(data, configuration);
                case 'rooms':
                    return this.validateRoomData(data, configuration);
                case 'menu':
                    return this.validateMenuData(data, configuration);
                default:
                    return this.validateGenericData(data, configuration);
            }
        } catch (error) {
            console.error("❌ Data validation failed:", error);
            throw error;
        }
    }

    /**
     * Validate product data
     */
    validateProductData(data, configuration) {
        const requiredColumns = ['name', 'price', 'availability'];
        const headers = data[0] || [];
        
        // Check required columns
        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                throw new Error(`Missing required column: ${column}`);
            }
        }
        
        // Validate data rows
        const validatedRows = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row.length >= requiredColumns.length) {
                const nameIndex = headers.indexOf('name');
                const priceIndex = headers.indexOf('price');
                const availabilityIndex = headers.indexOf('availability');
                
                if (row[nameIndex] && row[priceIndex] && row[availabilityIndex]) {
                    validatedRows.push(row);
                }
            }
        }
        
        return [headers, ...validatedRows];
    }

    /**
     * Validate service data
     */
    validateServiceData(data, configuration) {
        const requiredColumns = ['service', 'description', 'price', 'duration'];
        const headers = data[0] || [];
        
        // Check required columns
        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                console.warn(`Missing recommended column: ${column}`);
            }
        }
        
        return data;
    }

    /**
     * Validate inventory data
     */
    validateInventoryData(data, configuration) {
        const requiredColumns = ['item', 'quantity', 'status'];
        const headers = data[0] || [];
        
        // Check required columns
        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                console.warn(`Missing recommended column: ${column}`);
            }
        }
        
        return data;
    }

    /**
     * Validate room data
     */
    validateRoomData(data, configuration) {
        const requiredColumns = ['room', 'type', 'availability', 'price'];
        const headers = data[0] || [];
        
        // Check required columns
        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                console.warn(`Missing recommended column: ${column}`);
            }
        }
        
        return data;
    }

    /**
     * Validate menu data
     */
    validateMenuData(data, configuration) {
        const requiredColumns = ['item', 'category', 'price', 'availability'];
        const headers = data[0] || [];
        
        // Check required columns
        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                console.warn(`Missing recommended column: ${column}`);
            }
        }
        
        return data;
    }

    /**
     * Validate generic data
     */
    validateGenericData(data, configuration) {
        // Basic validation for generic data
        if (!data || data.length === 0) {
            throw new Error("Data is empty");
        }
        
        return data;
    }

    /**
     * Interpret sheet data intelligently
     */
    async interpretSheetData(data, sheetConfig) {
        try {
            const { dataType } = sheetConfig;
            
            // Basic interpretation
            const interpreted = {
                headers: data[0] || [],
                rows: data.slice(1),
                totalRows: data.length - 1,
                lastUpdate: new Date().toISOString(),
                dataType: dataType
            };
            
            // Add business logic
            switch (dataType) {
                case 'products':
                    interpreted.businessLogic = this.analyzeProductData(interpreted);
                    break;
                case 'services':
                    interpreted.businessLogic = this.analyzeServiceData(interpreted);
                    break;
                case 'inventory':
                    interpreted.businessLogic = this.analyzeInventoryData(interpreted);
                    break;
                case 'rooms':
                    interpreted.businessLogic = this.analyzeRoomData(interpreted);
                    break;
                case 'menu':
                    interpreted.businessLogic = this.analyzeMenuData(interpreted);
                    break;
            }
            
            return interpreted;
        } catch (error) {
            console.error("❌ Data interpretation failed:", error);
            throw error;
        }
    }

    /**
     * Analyze product data for business insights
     */
    analyzeProductData(data) {
        const { headers, rows } = data;
        const nameIndex = headers.indexOf('name');
        const priceIndex = headers.indexOf('price');
        const availabilityIndex = headers.indexOf('availability');
        
        const analysis = {
            totalProducts: rows.length,
            availableProducts: 0,
            unavailableProducts: 0,
            averagePrice: 0,
            priceRange: { min: Infinity, max: -Infinity },
            categories: new Set()
        };
        
        let totalPrice = 0;
        
        for (const row of rows) {
            // Availability analysis
            const availability = row[availabilityIndex]?.toLowerCase();
            if (availability === 'available' || availability === 'yes' || availability === '1') {
                analysis.availableProducts++;
            } else {
                analysis.unavailableProducts++;
            }
            
            // Price analysis
            const price = parseFloat(row[priceIndex]);
            if (!isNaN(price)) {
                totalPrice += price;
                analysis.priceRange.min = Math.min(analysis.priceRange.min, price);
                analysis.priceRange.max = Math.max(analysis.priceRange.max, price);
            }
            
            // Category analysis
            const categoryIndex = headers.indexOf('category');
            if (categoryIndex !== -1 && row[categoryIndex]) {
                analysis.categories.add(row[categoryIndex]);
            }
        }
        
        analysis.averagePrice = totalPrice / rows.length;
        analysis.categories = Array.from(analysis.categories);
        
        return analysis;
    }

    /**
     * Analyze service data for business insights
     */
    analyzeServiceData(data) {
        const { headers, rows } = data;
        
        return {
            totalServices: rows.length,
            serviceTypes: new Set(rows.map(row => row[headers.indexOf('service')])).size,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Analyze inventory data for business insights
     */
    analyzeInventoryData(data) {
        const { headers, rows } = data;
        const quantityIndex = headers.indexOf('quantity');
        const statusIndex = headers.indexOf('status');
        
        const analysis = {
            totalItems: rows.length,
            lowStockItems: 0,
            outOfStockItems: 0,
            totalQuantity: 0
        };
        
        for (const row of rows) {
            const quantity = parseInt(row[quantityIndex]);
            if (!isNaN(quantity)) {
                analysis.totalQuantity += quantity;
                
                if (quantity === 0) {
                    analysis.outOfStockItems++;
                } else if (quantity < 10) { // Low stock threshold
                    analysis.lowStockItems++;
                }
            }
        }
        
        return analysis;
    }

    /**
     * Analyze room data for business insights
     */
    analyzeRoomData(data) {
        const { headers, rows } = data;
        const availabilityIndex = headers.indexOf('availability');
        const typeIndex = headers.indexOf('type');
        
        const analysis = {
            totalRooms: rows.length,
            availableRooms: 0,
            roomTypes: new Set(),
            occupancyRate: 0
        };
        
        for (const row of rows) {
            const availability = row[availabilityIndex]?.toLowerCase();
            if (availability === 'available' || availability === 'yes') {
                analysis.availableRooms++;
            }
            
            if (row[typeIndex]) {
                analysis.roomTypes.add(row[typeIndex]);
            }
        }
        
        analysis.occupancyRate = ((analysis.totalRooms - analysis.availableRooms) / analysis.totalRooms) * 100;
        analysis.roomTypes = Array.from(analysis.roomTypes);
        
        return analysis;
    }

    /**
     * Analyze menu data for business insights
     */
    analyzeMenuData(data) {
        const { headers, rows } = data;
        const categoryIndex = headers.indexOf('category');
        const availabilityIndex = headers.indexOf('availability');
        
        const analysis = {
            totalItems: rows.length,
            availableItems: 0,
            categories: new Set()
        };
        
        for (const row of rows) {
            const availability = row[availabilityIndex]?.toLowerCase();
            if (availability === 'available' || availability === 'yes') {
                analysis.availableItems++;
            }
            
            if (row[categoryIndex]) {
                analysis.categories.add(row[categoryIndex]);
            }
        }
        
        analysis.categories = Array.from(analysis.categories);
        
        return analysis;
    }

    /**
     * Update knowledge cache in database
     */
    async updateKnowledgeCache(id, interpretedData, newHash) {
        try {
            const query = `
                UPDATE ai_knowledge_cache 
                SET cached_data = ?, 
                    data_hash = ?, 
                    last_update = CURRENT_TIMESTAMP,
                    freshness_score = 1.0
                WHERE id = ?
            `;
            
            await dbpromise.execute(query, [
                JSON.stringify(interpretedData),
                newHash,
                id
            ]);
        } catch (error) {
            console.error("❌ Failed to update knowledge cache:", error);
            throw error;
        }
    }

    /**
     * Log sheet change for analytics
     */
    async logSheetChange(cacheKey, sheetConfig, interpretedData) {
        try {
            const query = `
                INSERT INTO ai_analytics (event_type, provider, response_time, success, metadata)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            await dbpromise.execute(query, [
                'sheets_data_change',
                'google_sheets',
                new Date(),
                true,
                JSON.stringify({
                    cacheKey,
                    userId: sheetConfig.userId,
                    dataType: sheetConfig.dataType,
                    totalRows: interpretedData.totalRows,
                    businessLogic: interpretedData.businessLogic
                })
            ]);
        } catch (error) {
            console.error("❌ Failed to log sheet change:", error);
        }
    }

    /**
     * Add new sheet to monitoring
     */
    async addSheetToMonitoring(userId, config) {
        try {
            const { spreadsheetId, sheetName, range, dataType } = config;
            const cacheKey = `${userId}_${dataType}_${spreadsheetId}`;
            
            // Initial data fetch
            const initialData = await this.fetchSheetData(spreadsheetId, sheetName, range);
            const initialHash = this.calculateDataHash(initialData);
            
            // Validate and interpret data
            const validatedData = await this.validateSheetData(initialData, config);
            const interpretedData = await this.interpretSheetData(validatedData, config);
            
            // Insert into database
            const query = `
                INSERT INTO ai_knowledge_cache (
                    user_id, cache_key, data_source, data_type, 
                    cached_data, data_hash, configuration, 
                    freshness_score, is_active, last_update
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const [result] = await dbpromise.execute(query, [
                userId,
                cacheKey,
                'google_sheets',
                dataType,
                JSON.stringify(interpretedData),
                initialHash,
                JSON.stringify(config),
                1.0,
                1
            ]);
            
            // Add to monitoring
            this.monitoredSheets.set(cacheKey, {
                id: result.insertId,
                userId,
                spreadsheetId,
                sheetName,
                range,
                dataType,
                lastHash: initialHash,
                lastUpdate: new Date(),
                configuration: config
            });
            
            console.log(`✅ Added sheet to monitoring: ${cacheKey}`);
            return result.insertId;
        } catch (error) {
            console.error("❌ Failed to add sheet to monitoring:", error);
            throw error;
        }
    }

    /**
     * Remove sheet from monitoring
     */
    async removeSheetFromMonitoring(cacheKey) {
        try {
            const sheetConfig = this.monitoredSheets.get(cacheKey);
            if (!sheetConfig) {
                throw new Error(`Sheet not found: ${cacheKey}`);
            }
            
            // Remove from database
            const query = `UPDATE ai_knowledge_cache SET is_active = 0 WHERE id = ?`;
            await dbpromise.execute(query, [sheetConfig.id]);
            
            // Remove from monitoring
            this.monitoredSheets.delete(cacheKey);
            
            console.log(`✅ Removed sheet from monitoring: ${cacheKey}`);
        } catch (error) {
            console.error("❌ Failed to remove sheet from monitoring:", error);
            throw error;
        }
    }

    /**
     * Get monitoring status
     */
    getMonitoringStatus() {
        return {
            initialized: this.initialized,
            monitoredSheets: this.monitoredSheets.size,
            pollInterval: this.pollInterval,
            lastChecked: Math.max(...Array.from(this.lastChecked.values()).map(d => d.getTime()))
        };
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log("🛑 Stopped real-time monitoring");
        }
    }
}

module.exports = new RealTimeSheetsMonitor();
