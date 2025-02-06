const { createClient } = require('@supabase/supabase-js');

// Detailed logging function
function logEvent(message, details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        message,
        ...details
    }));
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    logEvent('CRITICAL: Missing Supabase configuration', {
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
    logEvent('Failed to create Supabase client', { error: clientError.message });
}

// Validation functions
function validatePhoneNumber(phone) {
    // Israeli mobile phone number validation
    const phoneRegex = /^05\d{8}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function validateName(name) {
    // Ensure name is at least 2 characters long and contains only Hebrew/English letters
    return name.trim().length >= 2 && /^[\u0590-\u05FF\u0020a-zA-Z]+$/.test(name);
}

exports.handler = async (event, context) => {
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
        logEvent('Invalid HTTP method', { method: event.httpMethod });
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    // Validate Supabase client
    if (!supabase) {
        logEvent('Supabase client not initialized');
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
        // Parse request body
        const body = JSON.parse(event.body);
        const { name, phone, date, time } = body;

        logEvent('Appointment creation request', { 
            name, 
            phone: phone.replace(/\d{4}$/, '****'), 
            date, 
            time 
        });

        // Comprehensive input validation
        if (!name || !validateName(name)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'שם לא תקין. אנא הזן שם תקין בעברית או באנגלית.' })
            };
        }

        if (!phone || !validatePhoneNumber(phone)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'מספר טלפון לא תקין. אנא הזן מספר טלפון של פלאפון ישראלי (05xxxxxxxx).' })
            };
        }

        if (!date) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'אנא בחר תאריך' })
            };
        }

        if (!time) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'אנא בחר שעה' })
            };
        }

        // Check if slot is already booked
        const { data: existingAppointment, error: checkError } = await supabase
            .from('appointments')
            .select('*')
            .eq('date', date)
            .eq('time', time)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            logEvent('Error checking existing appointments', { error: checkError });
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'שגיאה בבדיקת זמינות התור', 
                    details: checkError.message 
                })
            };
        }

        if (existingAppointment) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'צר לי, תור זה כבר תפוס. אנא בחר שעה אחרת.' })
            };
        }

        // Create appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert([{ 
                name: name.trim(), 
                phone: phone.replace(/\D/g, ''), 
                date, 
                time 
            }])
            .select();

        if (error) {
            logEvent('Appointment creation error', { error });
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'שגיאה ביצירת התור', 
                    details: error.message 
                })
            };
        }

        logEvent('Appointment created successfully', { 
            appointmentId: data[0]?.id, 
            date, 
            time 
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'התור נקבע בהצלחה!', 
                appointment: data[0] 
            })
        };

    } catch (error) {
        logEvent('Unexpected server error', { 
            errorMessage: error.message,
            errorStack: error.stack 
        });
        return { 
            statusCode: 500, 
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'שגיאה לא צפויה', 
                details: error.message 
            }) 
        };
    }
};
