const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const NotificationAPI = require('notification-api-js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Initialize NotificationAPI with credentials from environment variables
const notificationAPI = new NotificationAPI({
    clientId: process.env.NOTIFICATION_API_CLIENT_ID || 'de3k46fpjocxgwh6g9johrd70g',
    userId: process.env.NOTIFICATION_API_USER_ID || 'nlzh0j6y05ttda1tgn4szc8g069b9ahmzm5ltw0pmfm92v3j17pdammmmoq'
});

// Use module.exports for Node.js environment
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify Stripe webhook signature
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
            // Get customer details from Stripe
            const customer = await stripe.customers.retrieve(session.customer);
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            // Parse metadata from the session
            let userData, serviceSchedules, serviceSubscriptions;
            try {
                userData = JSON.parse(session.metadata.userData || '{}');
                serviceSchedules = JSON.parse(session.metadata.serviceSchedules || '[]');
                serviceSubscriptions = JSON.parse(session.metadata.serviceSubscriptions || '[]');
            } catch (error) {
                console.error('Error parsing metadata:', error);
                // Fallback to old method if metadata parsing fails
                userData = {
                    email: customer.email,
                    fullName: customer.name,
                    phone: customer.phone,
                    address: customer.shipping?.address?.line1,
                    city: customer.shipping?.address?.city,
                    state: customer.shipping?.address?.state,
                    zipCode: customer.shipping?.address?.postal_code
                };
            }
            
            // Create user profile in Supabase
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .upsert([{
                    stripe_customer_id: customer.id,
                    stripe_subscription_id: subscription.id,
                    email: userData.email || customer.email,
                    full_name: userData.fullName || customer.name,
                    phone: userData.phone || customer.phone,
                    address_line1: userData.address || customer.shipping?.address?.line1,
                    address_line2: customer.shipping?.address?.line2,
                    city: userData.city || customer.shipping?.address?.city,
                    state: userData.state || customer.shipping?.address?.state,
                    zip_code: userData.zipCode || customer.shipping?.address?.postal_code,
                    is_in_service_area: userData.isInServiceArea || true,
                    reminder_only: userData.reminderOnly || false,
                    reminder_preferences: {
                        method: 'email', // Default to email
                        enabled: true
                    }
                }])
                .select()
                .single();

            if (profileError) {
                throw new Error(`Error creating profile: ${profileError.message}`);
            }
            
            // Process service schedules from metadata
            if (serviceSchedules && serviceSchedules.length > 0) {
                const schedules = serviceSchedules.map(schedule => ({
                    profile_id: profile.id,
                    service_type: schedule.type,
                    pickup_day: schedule.pickupDay.toLowerCase(),
                    frequency: schedule.frequency.toLowerCase(),
                    start_date: schedule.startDate,
                    is_override: schedule.isOverride || false,
                    original_radar_schedule: schedule.originalSchedule
                }));


                const { error: scheduleError } = await supabase
                    .from('service_schedules')
                    .upsert(schedules);

                if (scheduleError) {
                    throw new Error(`Error saving schedules: ${scheduleError.message}`);
                }
            }
            
            // Process service subscriptions from metadata
            if (serviceSubscriptions && serviceSubscriptions.length > 0) {
                const subscriptions = serviceSubscriptions.map(sub => ({
                    profile_id: profile.id,
                    service_type: sub.type,
                    bin_quantity: sub.quantity,
                    subscription_status: 'active',
                    start_date: sub.startDate
                }));
                
                const { error: subscriptionError } = await supabase
                    .from('service_subscriptions')
                    .upsert(subscriptions);
                    
                if (subscriptionError) {
                    throw new Error(`Error saving subscriptions: ${subscriptionError.message}`);
                }
            }

            // Set up NotificationAPI for automated reminders
            // This integrates with the existing reminder system that runs via GitHub Actions
            await notificationAPI.identify(customer.email, {
                email: customer.email,
                phone: customer.phone || null, // Optional SMS notifications
                firstName: customer.name?.split(' ')[0],
                lastName: customer.name?.split(' ').slice(1).join(' '),
                // Include all service days for proper reminder scheduling
                serviceDays: Object.values(services).map(s => ({
                    day: s.serviceDay,
                    service: s.serviceType,
                    frequency: s.frequency
                })),
                // Add metadata for the garbage_reminder template
                address: `${customer.shipping?.address?.line1}, ${customer.shipping?.address?.city}`,
                startDate: startDate,
                reminderMethod: profile.reminder_preferences.method
            });

            // Send welcome notification using the garbage_reminder template
            try {
                await notificationAPI.send({
                    notificationId: 'garbage_reminder',
                    user: { id: customer.email },
                    data: {
                        nextPickup: Object.values(services).map(s => ({
                            service: s.serviceType || s.service, // Handle both formats
                            day: s.serviceDay || s.day, // Handle both formats
                            frequency: s.frequency,
                            bins: s.quantity
                        })),
                        address: `${customer.shipping?.address?.line1}, ${customer.shipping?.address?.city}`
                    }
                });
                console.log('Welcome notification sent successfully');
            } catch (notificationError) {
                console.error('Error sending welcome notification:', notificationError);
                // Continue processing even if notification fails
            }

            res.json({ received: true, success: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            // Return a more detailed error response
            res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            });
        }
    } else {
        res.json({ received: true });
    }
}
