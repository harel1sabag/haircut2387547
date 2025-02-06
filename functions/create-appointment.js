const { createClient } = require('@supabase/supabase-js');

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('Missing Supabase configuration');
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Validate Israeli phone number
function validatePhoneNumber(phone) {
    const phoneRegex = /^05\d{8}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

exports.handler = async (event, context) => {
    console.log('Appointment creation request received');

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        console.warn('Invalid HTTP method:', event.httpMethod);
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { name, phone, date, time } = JSON.parse(event.body);
        console.log('Received appointment data:', { name, phone, date, time });

        // Input validation
        if (!name || name.length < 2) {
            console.warn('Invalid name:', name);
            return { 
                statusCode: 400, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid name' }) 
            };
        }

        if (!validatePhoneNumber(phone)) {
            console.warn('Invalid phone number:', phone);
            return { 
                statusCode: 400, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid Israeli phone number' }) 
            };
        }

        if (!date || !time) {
            return { 
                statusCode: 400, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Date and time are required' }) 
            };
        }

        // Check for existing appointment
        const { data: existingAppointments, error: checkError } = await supabase
            .from('appointments')
            .select('*')
            .eq('date', date)
            .eq('time', time)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Database check error:', checkError);
            return { 
                statusCode: 500, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Database error', details: checkError.message }) 
            };
        }

        if (existingAppointments) {
            console.warn('Time slot already booked:', { date, time });
            return { 
                statusCode: 400, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Time slot already booked' }) 
            };
        }

        // Insert new appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert([
                { 
                    name, 
                    phone, 
                    date, 
                    time,
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Supabase insertion error:', error);
            return { 
                statusCode: 500, 
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Failed to create appointment', details: error.message }) 
            };
        }

        console.log('Appointment created successfully');
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(data[0])
        };

    } catch (error) {
        console.error('Appointment creation error:', error);
        return { 
            statusCode: 500, 
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to create appointment', 
                details: error.message 
            }) 
        };
    }
};
