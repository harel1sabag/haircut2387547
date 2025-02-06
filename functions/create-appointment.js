const { createClient } = require('@supabase/supabase-js');

// Enhanced logging function
function debugLog(message, details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'create-appointment',
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Validation functions
function validatePhoneNumber(phone) {
    // Israeli phone number validation
    const phoneRegex = /^(0(5[^7]|[2-4]|[8-9])|[1-9])\d{7}$/;
    return phoneRegex.test(phone);
}

function validateName(name) {
    // Basic name validation: at least 2 characters, only Hebrew/English letters
    const nameRegex = /^[א-תa-zA-Z\s]{2,}$/;
    return nameRegex.test(name);
}

exports.handler = async (event, context) => {
    debugLog('Appointment creation request received', { 
        method: event.httpMethod,
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

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        debugLog('Invalid HTTP method', { method: event.httpMethod });
        return { 
            statusCode: 405, 
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'שיטת בקשה לא חוקית', 
                details: 'רק בקשות POST מותרות' 
            }) 
        };
    }

    // Validate Supabase client
    if (!supabase) {
        debugLog('CRITICAL: Supabase client not initialized');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'שגיאת תצורת שרת', 
                details: 'לא ניתן ליצור לקוח Supabase' 
            })
        };
    }

    try {
        // Parse request body
        const body = JSON.parse(event.body);
        debugLog('Parsed request body', { 
            bodyKeys: Object.keys(body),
            date: body.date,
            time: body.time
        });

        // Validate input
        const { date, time, name, phone } = body;

        // Comprehensive input validation
        const validationErrors = [];

        if (!date) validationErrors.push('תאריך הוא שדה חובה');
        if (!time) validationErrors.push('שעה היא שדה חובה');
        
        if (!name) {
            validationErrors.push('שם הוא שדה חובה');
        } else if (!validateName(name)) {
            validationErrors.push('שם לא תקין. אנא הזן שם באותיות עברית/אנגלית');
        }

        if (!phone) {
            validationErrors.push('מספר טלפון הוא שדה חובה');
        } else if (!validatePhoneNumber(phone)) {
            validationErrors.push('מספר טלפון לא תקין. אנא הזן מספר טלפון ישראלי תקין');
        }

        // Check for existing appointments at same time and date
        const { data: existingAppointments, error: existingError } = await supabase
            .from('appointments')
            .select('*')
            .eq('date', date)
            .eq('time', time);

        if (existingError) {
            debugLog('Error checking existing appointments', {
                errorMessage: existingError.message,
                errorDetails: existingError
            });
            validationErrors.push('שגיאה בבדיקת זמינות התור');
        }

        if (existingAppointments && existingAppointments.length > 0) {
            validationErrors.push('זמן זה כבר תפוס. אנא בחר זמן אחר.');
        }

        // If validation errors exist, return them
        if (validationErrors.length > 0) {
            debugLog('Validation errors', { 
                errors: validationErrors 
            });
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'שגיאות אימות', 
                    details: validationErrors 
                })
            };
        }

        // Insert appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert([{ date, time, name, phone }])
            .select();

        debugLog('Appointment insertion result', { 
            insertedData: data,
            insertError: error
        });

        if (error) {
            debugLog('Supabase insertion error', { 
                errorMessage: error.message,
                errorDetails: error,
                errorCode: error.code
            });
            return { 
                statusCode: 500, 
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'שגיאה ביצירת תור', 
                    details: error.message 
                }) 
            };
        }

        // Successful appointment creation
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'התור נוצר בהצלחה', 
                appointment: data[0] 
            })
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
                error: 'שגיאה לא צפויה', 
                details: error.message 
            }) 
        };
    }
};
