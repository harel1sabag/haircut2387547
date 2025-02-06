const { createClient } = require('@supabase/supabase-js');

// Enhanced logging function
function debugLog(message, details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'available-slots',
        message,
        environment: {
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET' : 'UNSET'
        },
        ...details
    }));
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Validate environment variables early
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    debugLog('CRITICAL: Missing Supabase configuration', {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY ? '***MASKED***' : 'UNSET'
    });
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

try {
    supabase = createClient(supabaseUrl, supabaseKey);
    debugLog('Supabase client created successfully');
} catch (clientError) {
    debugLog('CRITICAL: Failed to create Supabase client', { 
        errorMessage: clientError.message,
        errorStack: clientError.stack
    });
}

// Predefined valid time slots
const VALID_TIMES = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

// Table structure validation function
async function validateTableStructure(supabaseClient) {
    try {
        // Attempt to fetch table info
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('id, date, time, name, phone', { count: 'exact' });

        if (error) {
            debugLog('Table structure validation failed', {
                errorMessage: error.message,
                errorCode: error.code
            });
            return false;
        }

        debugLog('Table structure validation successful', {
            totalRecords: data.length,
            columns: ['id', 'date', 'time', 'name', 'phone']
        });

        return true;
    } catch (catchError) {
        debugLog('Unexpected error during table validation', {
            errorMessage: catchError.message,
            errorStack: catchError.stack
        });
        return false;
    }
}

exports.handler = async (event, context) => {
    debugLog('Available slots request received', { 
        method: event.httpMethod,
        queryParams: event.queryStringParameters,
        headers: event.headers
    });

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        debugLog('Invalid HTTP method', { method: event.httpMethod });
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    // Validate Supabase client
    if (!supabase) {
        debugLog('CRITICAL: Supabase client not initialized');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Server configuration error', 
                details: 'Supabase client could not be created',
                environment: {
                    SUPABASE_URL: !!supabaseUrl,
                    SUPABASE_KEY: !!supabaseKey
                }
            })
        };
    }

    // Validate table structure before processing
    const tableValid = await validateTableStructure(supabase);
    if (!tableValid) {
        debugLog('CRITICAL: Table structure validation failed');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Database configuration error', 
                details: 'Invalid table structure' 
            })
        };
    }

    try {
        const { target_date } = event.queryStringParameters || {};
        debugLog('Processing date request', { target_date });

        // Validate date
        if (!target_date) {
            debugLog('No date provided in request');
            return { 
                statusCode: 400, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Date is required' }) 
            };
        }

        // Fetch booked slots for the date
        const { data: bookedSlots, error } = await supabase
            .from('appointments')
            .select('time')
            .eq('date', target_date);

        debugLog('Booked slots query result', { 
            bookedSlotsCount: bookedSlots ? bookedSlots.length : 0,
            queryError: error,
            queriedDate: target_date
        });

        if (error) {
            debugLog('Supabase query error', { 
                errorMessage: error.message,
                errorDetails: error,
                errorCode: error.code
            });
            return { 
                statusCode: 500, 
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Failed to fetch available slots', 
                    details: error.message 
                }) 
            };
        }

        // Determine available slots
        const bookedTimes = (bookedSlots || []).map(slot => slot.time);
        const availableSlots = VALID_TIMES
            .filter(time => !bookedTimes.includes(time))
            .map(time => ({ time }));

        debugLog('Available slots determined', { 
            totalSlots: VALID_TIMES.length,
            bookedSlots: bookedTimes.length,
            availableSlots: availableSlots.length,
            availableSlotTimes: availableSlots.map(slot => slot.time)
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(availableSlots)
        };

    } catch (error) {
        debugLog('Unexpected server error', { 
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name
        });
        return { 
            statusCode: 500, 
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Unexpected server error', 
                details: error.message 
            }) 
        };
    }
};
