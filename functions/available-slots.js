const { createClient } = require('@supabase/supabase-js');

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('CRITICAL: Missing Supabase configuration');
    console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not Set');
    console.error('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Not Set');
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

try {
    supabase = createClient(supabaseUrl, supabaseKey);
} catch (clientError) {
    console.error('Failed to create Supabase client:', clientError);
}

// Valid time slots
const VALID_TIMES = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

exports.handler = async (event, context) => {
    console.log(' Available slots request received');
    console.log('Full event:', JSON.stringify(event, null, 2));

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
        console.warn(' Invalid HTTP method:', event.httpMethod);
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    // Validate Supabase client
    if (!supabase) {
        console.error(' Supabase client not initialized');
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
        console.log(' Requested date:', target_date);

        // Validate date
        if (!target_date) {
            console.warn(' No date provided');
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

        console.log(' Booked slots query result:', {
            bookedSlots: bookedSlots || 'No slots',
            error: error || 'No error'
        });

        if (error) {
            console.error(' Supabase query error:', error);
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

        console.log(' Available slots:', availableSlots);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(availableSlots)
        };

    } catch (error) {
        console.error(' Available slots unexpected error:', error);
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
