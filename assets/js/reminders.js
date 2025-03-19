import { supabase, getTomorrowReminders, isRecyclingWeek, logReminder, createUserProfile, saveServiceSchedule } from './supabase-client.js';

// NotificationAPI configuration
const NOTIFICATION_API_ENDPOINT = 'https://api.notificationapi.com/de3k46fpjocxgwh6g9johrd70g/sender';
const NOTIFICATION_API_AUTH = 'Basic ZGUzazQ2ZnBqb2N4Z3doNmc5am9ocmQ3MGc6bmx6aDBqNnkwNXR0ZGExdGduNHN6YzhnMDY5YjlhaG16bTVsdHcwcG1mbTkydjNqMTdwZGFtbW1vcQ==';

// Function to send notification using NotificationAPI
async function sendNotification(profile, notificationData) {
    try {
        const response = await fetch(NOTIFICATION_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': NOTIFICATION_API_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notificationId: 'service_reminder',
                user: {
                    id: profile.email,
                    email: profile.email,
                    number: profile.phone
                },
                mergeTags: {
                    services: notificationData.services,
                    address: `${profile.address_line1}, ${profile.city}, ${profile.state}`,
                    name: profile.full_name
                }
            })
        });

        if (!response.ok) {
            console.error('NotificationAPI error:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

// Function to generate reminder message
function generateReminderMessage(schedule) {
    const services = [];
    
    // Check if it's a pickup day for this service type
    if (schedule.service_type === 'trash' && schedule.frequency === 'weekly') {
        services.push('trash');
    } else if (schedule.service_type === 'recycling' && 
               schedule.frequency === 'biweekly' && 
               isRecyclingWeek(schedule.start_date)) {
        services.push('recycling');
    } else if (schedule.service_type === 'compost') {
        services.push('compost');
    }
    
    if (services.length === 0) return null;
    
    return {
        services: services.join(' and ')
    };
}



// Main function to process and send reminders
async function processReminders() {
    try {
        const schedules = await getTomorrowReminders();
        
        for (const schedule of schedules) {
            const notificationData = generateReminderMessage(schedule);
            if (!notificationData) continue; // Skip if no reminder needed
            
            const profile = schedule.profiles;
            const reminderSent = await sendNotification(profile, notificationData);
            
            // Log the reminder attempt
            await logReminder({
                profileId: profile.id,
                message: notificationData.message,
                method: profile.email ? 'email' : 'sms',
                status: reminderSent ? 'sent' : 'failed',
                serviceType: schedule.service_type
            });
        }
    } catch (error) {
        console.error('Error processing reminders:', error);
    }
}

// Function to handle reminder signup
async function handleReminderSignup(formData) {
    try {
        const userData = {
            email: formData.get('email'),
            fullName: formData.get('full-name'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zip'),
            isInServiceArea: sessionStorage.getItem('isInServiceArea') === 'true',
            reminderOnly: true,
            manualSchedule: !formData.get('radar_schedule'),
            radarOverride: formData.get('override_schedule') === 'true'
        };

        const profile = await createUserProfile(userData);



        // Save service schedules
        const services = ['trash', 'recycling', 'compost'];
        for (const service of services) {
            const frequency = formData.get(`${service}-frequency`);
            const pickupDay = formData.get(`${service}-day`);
            
            if (frequency && pickupDay) {
                await saveServiceSchedule({
                    profileId: profile.id,
                    type: service,
                    pickupDay: pickupDay,
                    frequency: frequency,
                    startDate: new Date().toISOString(),
                    isOverride: userData.radarOverride,
                    originalSchedule: formData.get('radar_schedule')
                });
            }
        }

        return { success: true, message: 'Successfully signed up for reminders!' };
    } catch (error) {
        console.error('Error signing up for reminders:', error);
        return { success: false, message: 'Error signing up for reminders. Please try again.' };
    }
}

// Export functions
export {
    processReminders,
    handleReminderSignup
};