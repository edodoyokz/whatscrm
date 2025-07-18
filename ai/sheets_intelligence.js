const { dbpromise } = require("../database/dbpromise");
const { google } = require('googleapis');

/**
 * Sheets Intelligence - Real-time Google Sheets integration for AI
 * Handles live data synchronization and intelligent interpretation
 */
class SheetsIntelligence {
    constructor() {
        this.sheets = null;
        this.syncIntervals = new Map();
        this.dataCache = new Map();
        this.lastSync = new Map();
        this.initialized = false;
    }

    /**
     * Initialize Google Sheets connection
     */
    async initialize() {
        try {
            console.log("📊 Initializing Sheets Intelligence...");
            
            // Initialize Google Sheets API
            this.sheets = google.sheets('v4');
            
            // Setup authentication (will be enhanced with proper auth)
            await this.setupAuthentication();
            
            // Start sync processes for active users
            await this.startActiveSyncProcesses();
            
            this.initialized = true;
            console.log("✅ Sheets Intelligence initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Sheets Intelligence:", error);
            throw error;
        }
    }

    /**
     * Get real-time data for AI query
     * @param {number} userId - User ID
     * @param {string} queryType - Type of query (inventory, services, rooms, etc.)
     * @param {string} queryData - Specific query data
     * @returns {Object} - Processed data for AI
     */
    async getRealtimeData(userId, queryType, queryData = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Check cache first
            const cacheKey = `${userId}-${queryType}`;
            let cachedData = this.dataCache.get(cacheKey);
            
            // Check if cache is fresh (less than 30 seconds old)
            const lastSyncTime = this.lastSync.get(cacheKey);
            const isCacheFresh = lastSyncTime && (Date.now() - lastSyncTime) < 30000;
            
            if (!cachedData || !isCacheFresh) {
                // Fetch fresh data
                cachedData = await this.fetchFreshData(userId, queryType);
                
                // Update cache
                this.dataCache.set(cacheKey, cachedData);
                this.lastSync.set(cacheKey, Date.now());
                
                // Update database cache
                await this.updateDatabaseCache(userId, queryType, cachedData);
            }
            
            // Process data for specific query
            const processedData = await this.processDataForQuery(cachedData, queryType, queryData);
            
            return processedData;
        } catch (error) {
            console.error("❌ Error getting realtime data:", error);
            
            // Fallback to database cache
            return await this.getFallbackData(userId, queryType, queryData);
        }
    }

    /**
     * Fetch fresh data from Google Sheets
     */
    async fetchFreshData(userId, queryType) {
        try {
            // Get user's sheet configuration
            const sheetConfig = await this.getUserSheetConfig(userId, queryType);
            
            if (!sheetConfig || !sheetConfig.sheet_id) {
                console.log(`📋 No sheet configuration found for user ${userId}, type ${queryType}`);
                return [];
            }
            
            // Fetch data from Google Sheets
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: sheetConfig.sheet_id,
                range: this.getSheetRange(queryType),
                valueRenderOption: 'FORMATTED_VALUE'
            });
            
            const values = response.data.values || [];
            
            // Process raw data
            const processedData = this.processRawSheetData(values, queryType);
            
            console.log(`📊 Fetched ${processedData.length} rows for ${queryType} from user ${userId}`);
            
            return processedData;
        } catch (error) {
            console.error("❌ Error fetching fresh data:", error);
            return [];
        }
    }

    /**
     * Process data for specific AI query
     */
    async processDataForQuery(data, queryType, queryData) {
        try {
            const processors = {
                inventory: this.processInventoryQuery,
                services: this.processServicesQuery,
                rooms: this.processRoomsQuery,
                restaurant: this.processRestaurantQuery
            };
            
            const processor = processors[queryType];
            if (!processor) {
                console.log(`❓ No processor found for query type: ${queryType}`);
                return { data, interpretation: 'raw_data' };
            }
            
            return await processor.call(this, data, queryData);
        } catch (error) {
            console.error("❌ Error processing data for query:", error);
            return { data, interpretation: 'error', error: error.message };
        }
    }

    /**
     * Process inventory query
     */
    async processInventoryQuery(data, queryData) {
        try {
            const { productName, action } = queryData;
            
            let result = {
                data: data,
                interpretation: 'inventory_data',
                summary: {
                    totalProducts: data.length,
                    availableProducts: data.filter(item => item.status === 'Available').length,
                    lowStockProducts: data.filter(item => 
                        parseInt(item.stock) < parseInt(item.minStock || 10)
                    ).length
                }
            };
            
            // Specific product query
            if (productName) {
                const product = data.find(item => 
                    item.name?.toLowerCase().includes(productName.toLowerCase())
                );
                
                if (product) {
                    result.specificProduct = product;
                    result.interpretation = 'specific_product';
                    result.availability = {
                        inStock: parseInt(product.stock) > 0,
                        quantity: parseInt(product.stock),
                        status: product.status,
                        lowStock: parseInt(product.stock) < parseInt(product.minStock || 10)
                    };
                } else {
                    result.interpretation = 'product_not_found';
                    result.suggestions = this.findSimilarProducts(data, productName);
                }
            }
            
            return result;
        } catch (error) {
            console.error("❌ Error processing inventory query:", error);
            return { data, interpretation: 'error', error: error.message };
        }
    }

    /**
     * Process services query
     */
    async processServicesQuery(data, queryData) {
        try {
            const { serviceName, requestedTime } = queryData;
            
            let result = {
                data: data,
                interpretation: 'services_data',
                summary: {
                    totalServices: data.length,
                    availableServices: data.filter(item => item.availability === 'Available').length,
                    activeServices: data.filter(item => item.status === 'Active').length
                }
            };
            
            // Specific service query
            if (serviceName) {
                const service = data.find(item => 
                    item.name?.toLowerCase().includes(serviceName.toLowerCase())
                );
                
                if (service) {
                    result.specificService = service;
                    result.interpretation = 'specific_service';
                    result.availability = {
                        available: service.availability === 'Available',
                        duration: service.duration,
                        price: service.price,
                        staff: service.staff
                    };
                } else {
                    result.interpretation = 'service_not_found';
                    result.suggestions = this.findSimilarServices(data, serviceName);
                }
            }
            
            return result;
        } catch (error) {
            console.error("❌ Error processing services query:", error);
            return { data, interpretation: 'error', error: error.message };
        }
    }

    /**
     * Process rooms query
     */
    async processRoomsQuery(data, queryData) {
        try {
            const { roomName, requestedDate } = queryData;
            
            let result = {
                data: data,
                interpretation: 'rooms_data',
                summary: {
                    totalRooms: data.length,
                    availableRooms: data.filter(item => item.availability === 'Available').length,
                    occupiedRooms: data.filter(item => item.availability === 'Occupied').length
                }
            };
            
            // Specific room query
            if (roomName) {
                const room = data.find(item => 
                    item.name?.toLowerCase().includes(roomName.toLowerCase())
                );
                
                if (room) {
                    result.specificRoom = room;
                    result.interpretation = 'specific_room';
                    result.availability = {
                        available: room.availability === 'Available',
                        capacity: room.capacity,
                        rate: room.rate,
                        type: room.type
                    };
                } else {
                    result.interpretation = 'room_not_found';
                    result.suggestions = this.findSimilarRooms(data, roomName);
                }
            }
            
            return result;
        } catch (error) {
            console.error("❌ Error processing rooms query:", error);
            return { data, interpretation: 'error', error: error.message };
        }
    }

    /**
     * Process restaurant query
     */
    async processRestaurantQuery(data, queryData) {
        try {
            const { dishName, category } = queryData;
            
            let result = {
                data: data,
                interpretation: 'restaurant_data',
                summary: {
                    totalItems: data.length,
                    availableItems: data.filter(item => item.availability === 'Available').length,
                    specials: data.filter(item => item.special === 'Yes').length
                }
            };
            
            // Specific dish query
            if (dishName) {
                const dish = data.find(item => 
                    item.name?.toLowerCase().includes(dishName.toLowerCase())
                );
                
                if (dish) {
                    result.specificDish = dish;
                    result.interpretation = 'specific_dish';
                    result.availability = {
                        available: dish.availability === 'Available',
                        price: dish.price,
                        category: dish.category,
                        special: dish.special === 'Yes'
                    };
                } else {
                    result.interpretation = 'dish_not_found';
                    result.suggestions = this.findSimilarDishes(data, dishName);
                }
            }
            
            return result;
        } catch (error) {
            console.error("❌ Error processing restaurant query:", error);
            return { data, interpretation: 'error', error: error.message };
        }
    }

    /**
     * Get user's sheet configuration
     */
    async getUserSheetConfig(userId, queryType) {
        try {
            const query = `
                SELECT sheet_id, sheet_name, data_type, last_sync, sync_frequency
                FROM ai_knowledge_cache 
                WHERE user_id = ? AND data_type = ? AND is_valid = TRUE
                ORDER BY last_sync DESC
                LIMIT 1
            `;
            
            const [rows] = await dbpromise.execute(query, [userId, queryType]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("❌ Error getting user sheet config:", error);
            return null;
        }
    }

    /**
     * Get appropriate sheet range for query type
     */
    getSheetRange(queryType) {
        const ranges = {
            inventory: 'Products!A:Z',
            services: 'Services!A:Z',
            rooms: 'Rooms!A:Z',
            restaurant: 'Menu!A:Z'
        };
        
        return ranges[queryType] || 'A:Z';
    }

    /**
     * Process raw sheet data
     */
    processRawSheetData(values, queryType) {
        try {
            if (!values || values.length === 0) {
                return [];
            }
            
            const headers = values[0];
            const data = values.slice(1);
            
            return data.map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    const key = header.toLowerCase().replace(/\s+/g, '');
                    item[key] = row[index] || '';
                });
                return item;
            });
        } catch (error) {
            console.error("❌ Error processing raw sheet data:", error);
            return [];
        }
    }

    /**
     * Update database cache
     */
    async updateDatabaseCache(userId, queryType, data) {
        try {
            const query = `
                INSERT INTO ai_knowledge_cache (
                    user_id, sheet_id, sheet_name, data_type, cached_data, last_sync, is_valid
                ) VALUES (?, ?, ?, ?, ?, NOW(), TRUE)
                ON DUPLICATE KEY UPDATE
                    cached_data = VALUES(cached_data),
                    last_sync = NOW(),
                    is_valid = TRUE,
                    updated_at = NOW()
            `;
            
            await dbpromise.execute(query, [
                userId,
                'temp_sheet_id', // Will be replaced with actual sheet ID
                queryType,
                queryType,
                JSON.stringify(data)
            ]);
        } catch (error) {
            console.error("❌ Error updating database cache:", error);
        }
    }

    /**
     * Get fallback data from database
     */
    async getFallbackData(userId, queryType, queryData) {
        try {
            const query = `
                SELECT cached_data, last_sync
                FROM ai_knowledge_cache 
                WHERE user_id = ? AND data_type = ? AND is_valid = TRUE
                ORDER BY last_sync DESC
                LIMIT 1
            `;
            
            const [rows] = await dbpromise.execute(query, [userId, queryType]);
            
            if (rows.length > 0) {
                const data = JSON.parse(rows[0].cached_data);
                return await this.processDataForQuery(data, queryType, queryData);
            }
            
            return { data: [], interpretation: 'no_data', error: 'No cached data available' };
        } catch (error) {
            console.error("❌ Error getting fallback data:", error);
            return { data: [], interpretation: 'error', error: error.message };
        }
    }

    /**
     * Find similar products
     */
    findSimilarProducts(data, productName) {
        try {
            return data.filter(item => 
                item.name?.toLowerCase().includes(productName.toLowerCase()) ||
                item.category?.toLowerCase().includes(productName.toLowerCase())
            ).slice(0, 3);
        } catch (error) {
            return [];
        }
    }

    /**
     * Find similar services
     */
    findSimilarServices(data, serviceName) {
        try {
            return data.filter(item => 
                item.name?.toLowerCase().includes(serviceName.toLowerCase()) ||
                item.category?.toLowerCase().includes(serviceName.toLowerCase())
            ).slice(0, 3);
        } catch (error) {
            return [];
        }
    }

    /**
     * Find similar rooms
     */
    findSimilarRooms(data, roomName) {
        try {
            return data.filter(item => 
                item.name?.toLowerCase().includes(roomName.toLowerCase()) ||
                item.type?.toLowerCase().includes(roomName.toLowerCase())
            ).slice(0, 3);
        } catch (error) {
            return [];
        }
    }

    /**
     * Find similar dishes
     */
    findSimilarDishes(data, dishName) {
        try {
            return data.filter(item => 
                item.name?.toLowerCase().includes(dishName.toLowerCase()) ||
                item.category?.toLowerCase().includes(dishName.toLowerCase())
            ).slice(0, 3);
        } catch (error) {
            return [];
        }
    }

    /**
     * Setup authentication with proper Google Sheets OAuth
     */
    async setupAuthentication() {
        try {
            console.log("🔑 Setting up Google Sheets authentication...");
            
            const auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
            
            this.auth = auth;
            this.sheets = google.sheets({ version: 'v4', auth });
            
            console.log("✅ Google Sheets authentication configured");
        } catch (error) {
            console.error("❌ Google Sheets authentication failed:", error);
            throw new Error(`Google Sheets authentication error: ${error.message}`);
        }
    }

    /**
     * Start active sync processes with error handling
     */
    async startActiveSyncProcesses() {
        try {
            console.log("🔄 Starting active sync processes...");
            
            // Get active users with sheet configurations
            const [users] = await dbpromise(`
                SELECT DISTINCT user_id
                FROM ai_knowledge_cache
                WHERE is_valid = TRUE
                AND last_sync > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);
            
            for (const user of users) {
                await this.startUserSync(user.user_id);
            }
            
            console.log(`✅ Started sync processes for ${users.length} users`);
        } catch (error) {
            console.error("❌ Failed to start sync processes:", error);
        }
    }

    /**
     * Start sync for specific user
     */
    async startUserSync(userId) {
        const syncInterval = setInterval(async () => {
            try {
                await this.syncUserData(userId);
            } catch (error) {
                console.error(`❌ Sync failed for user ${userId}:`, error);
                clearInterval(syncInterval);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        this.syncIntervals.set(userId, syncInterval);
    }

    /**
     * Sync data for specific user
     */
    async syncUserData(userId) {
        const dataTypes = ['inventory', 'services', 'rooms', 'restaurant'];
        
        for (const dataType of dataTypes) {
            try {
                await this.getRealtimeData(userId, dataType);
            } catch (error) {
                console.error(`❌ Failed to sync ${dataType} for user ${userId}:`, error);
            }
        }
    }
}

module.exports = new SheetsIntelligence();
