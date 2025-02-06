const { createClient } = require('@supabase/supabase-js');

// Detailed logging function
function logError(message, details = {}) {
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        message,
        ...details
    }));
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    logError('CRITICAL: Missing Supabase configuration', {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY
    });
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

try {
    supabase = createClient(supabaseUrl, supabaseKey);
} catch (clientError) {
    logError('Failed to create Supabase client', { error: clientError.message });
}

// Valid time slots
const VALID_TIMES = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

exports.handler = async (event, context) => {
    logError('Available slots request received', { 
        method: event.httpMethod,
        queryParams: event.queryStringParameters 
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
        logError('Invalid HTTP method', { method: event.httpMethod });
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    // Validate Supabase client
    if (!supabase) {
        logError('Supabase client not initialized');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Server configuration error', 
                details: 'Supabase client could not be created' 
            })
        };
    }

    try {
        const { target_date } = event.queryStringParameters || {};
        logError('Processing date request', { target_date });

        // Validate date
        if (!target_date) {
            logError('No date provided');
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

        logError('Booked slots query result', { 
            bookedSlots: bookedSlots || 'No slots',
            error: error || 'No error'
        });

        if (error) {
            logError('Supabase query error', { 
                errorMessage: error.message,
                errorDetails: error 
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

        logError('Available slots determined', { availableSlots });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(availableSlots)
        };

    } catch (error) {
        logError('Unexpected server error', { 
            errorMessage: error.message,
            errorStack: error.stack 
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
