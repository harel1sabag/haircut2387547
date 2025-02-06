const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Valid time slots
const VALID_TIMES = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { target_date } = event.queryStringParameters;

        // Validate date
        if (!target_date) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Date is required' }) 
            };
        }

        // Fetch booked slots for the date
        const { data: bookedSlots, error } = await supabase
            .from('appointments')
            .select('time')
            .eq('date', target_date);

        if (error) throw error;

        // Determine available slots
        const bookedTimes = bookedSlots.map(slot => slot.time);
        const availableSlots = VALID_TIMES
            .filter(time => !bookedTimes.includes(time))
            .map(time => ({ time }));

        return {
            statusCode: 200,
            body: JSON.stringify(availableSlots)
        };

    } catch (error) {
        console.error('Available slots error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to fetch available slots' }) 
        };
    }
};
