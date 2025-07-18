// Quick Local Testing Script
console.log('🧪 Starting Local Tests...\n');

const tests = [
    {
        name: 'App.js Import',
        test: () => {
            try {
                require('./app.js');
                return { success: true, message: 'App.js loaded successfully' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'Route: Dashboard',
        test: () => {
            try {
                require('./routes/dashboard.js');
                return { success: true, message: 'Dashboard route loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'Route: AI Enhanced',
        test: () => {
            try {
                require('./routes/ai_enhanced.js');
                return { success: true, message: 'AI Enhanced route loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'Route: AI Realtime',
        test: () => {
            try {
                require('./routes/ai_realtime.js');
                return { success: true, message: 'AI Realtime route loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'AI: Natural Conversation Engine',
        test: () => {
            try {
                require('./ai/natural_conversation_engine.js');
                return { success: true, message: 'Natural Conversation Engine loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'AI: Context Manager',
        test: () => {
            try {
                require('./ai/context_manager.js');
                return { success: true, message: 'Context Manager loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'Middleware: Auth',
        test: () => {
            try {
                require('./middlewares/auth.js');
                return { success: true, message: 'Auth middleware loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    },
    {
        name: 'Middleware: User',
        test: () => {
            try {
                require('./middlewares/user.js');
                return { success: true, message: 'User middleware loaded' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        }
    }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
    process.stdout.write(`${index + 1}. ${test.name}... `);
    
    const result = test.test();
    
    if (result.success) {
        console.log('✅ PASS');
        passed++;
    } else {
        console.log('❌ FAIL');
        console.log(`   Error: ${result.message}`);
        failed++;
    }
});

console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

if (failed === 0) {
    console.log('\n🎉 All tests passed! Ready for Docker deployment.');
    console.log('\n🚀 Next steps:');
    console.log('   1. docker-compose build --no-cache');
    console.log('   2. docker-compose up -d');
    console.log('   3. docker-compose logs -f whatscrm-ai');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed. Please fix the errors above before deploying.');
    process.exit(1);
}
