// Initialize Supabase client
const SUPABASE_URL = 'https://dewunitajzbaqqdwwwan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld3VuaXRhanpiYXFxZHd3d2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNTU1MjgsImV4cCI6MjA1NzczMTUyOH0.TMq3igva1da-W33NtMq7Hb8eW49hiLR9-xIK_AXjJXc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to create or update user profile
async function createUserProfile(userData) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert([{
                email: userData.email,
                full_name: userData.fullName,
                phone: userData.phone,
                address_line1: userData.address,
                city: userData.city,
                state: userData.state,
                zip_code: userData.zipCode,
                is_in_service_area: userData.isInServiceArea,
                reminder_only: userData.reminderOnly,
                manual_schedule: userData.manualSchedule || false,
                radar_override: userData.radarOverride || false
            }], {
                onConflict: 'email',
                returning: true
            })
            .select()
            .single();

        if (error) throw error;
        return profile;
    } catch (error) {
        console.error('Error creating/updating profile:', error);
        throw error;
    }
}

// Function to save service schedule
async function saveServiceSchedule(scheduleData) {
    try {
        const { data: schedule, error } = await supabase
            .from('service_schedules')
            .upsert([{
                profile_id: scheduleData.profileId,
                service_type: scheduleData.type,
                pickup_day: scheduleData.pickupDay,
                frequency: scheduleData.frequency,
                start_date: scheduleData.startDate,
                is_override: scheduleData.isOverride || false,
                original_radar_schedule: scheduleData.originalSchedule,
                is_active: true
            }], {
                onConflict: 'profile_id,service_type',
                returning: true
            });

        if (error) throw error;
        return schedule;
    } catch (error) {
        console.error('Error saving service schedule:', error);
        throw error;
    }
}

// Function to get users with reminders for tomorrow
async function getTomorrowReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekday = tomorrow.toLocaleDateString('en-US', { weekday: 'lowercase' });

    const { data: schedules, error } = await supabase
        .from('service_schedules')
        .select(`
            *,
            profiles (
                id,
                full_name,
                email,
                phone,
                address_line1,
                city,
                state
            )
        `)
        .eq('pickup_day', weekday)
        .eq('is_active', true);

    if (error) throw error;
    return schedules;
}

// Function to check if it's a recycling week
function isRecyclingWeek(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const weeksDiff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
    return weeksDiff % 2 === 0;
}

// Function to log reminder
async function logReminder(reminderData) {
    try {
        const { error } = await supabase
            .from('reminder_logs')
            .insert([{
                profile_id: reminderData.profileId,
                message_content: reminderData.message,
                delivery_method: reminderData.method,
                delivery_status: reminderData.status,
                service_type: reminderData.serviceType
            }]);

        if (error) throw error;
    } catch (error) {
        console.error('Error logging reminder:', error);
        throw error;
    }
}

// Function to create service subscription
async function createServiceSubscription(profileId, subscriptionData) {
    try {
        const { data: subscription, error } = await supabase
            .from('service_subscriptions')
            .insert([{
                profile_id: profileId,
                service_type: subscriptionData.type,
                bin_quantity: subscriptionData.quantity,
                subscription_status: 'pending',
                start_date: subscriptionData.startDate
            }])
            .select();

        if (error) throw error;
        return subscription;
    } catch (error) {
        console.error('Error creating service subscription:', error);
        throw error;
    }
}

export {
    supabase,
    createUserProfile,
    saveServiceSchedule,
    getTomorrowReminders,
    isRecyclingWeek,
    logReminder,
    createServiceSubscription
};