const { createClient } = require('@supabase/supabase-js');

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
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { name, phone, date, time } = JSON.parse(event.body);

        // Input validation
        if (!name || name.length < 2) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Invalid name' }) 
            };
        }

        if (!validatePhoneNumber(phone)) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Invalid Israeli phone number' }) 
            };
        }

        // Check for existing appointment
        const { data: existingAppointments, error: checkError } = await supabase
            .from('appointments')
            .select('*')
            .eq('date', date)
            .eq('time', time)
            .single();

        if (existingAppointments) {
            return { 
                statusCode: 400, 
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

        if (error) throw error;

        return {
            statusCode: 201,
            body: JSON.stringify(data[0])
        };

    } catch (error) {
        console.error('Appointment creation error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to create appointment' }) 
        };
    }
};
