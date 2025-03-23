import { supabase, getTomorrowReminders, isRecyclingWeek, logReminder, createUserProfile, saveServiceSchedule } from './supabase-client.js';

// NotificationAPI configuration
const NOTIFICATION_API_ENDPOINT = 'https://api.notificationapi.com/de3k46fpjocxgwh6g9johrd70g/sender';
const NOTIFICATION_API_AUTH = 'Basic ZGUzazQ2ZnBqb2N4Z3doNmc5am9ocmQ3MGc6bmx6aDBqNnkwNXR0ZGExdGduNHN6YzhnMDY5YjlhaG16bTVsdHcwcG1mbTkydjNqMTdwZGFtbW1vcQ==';

// Store verification data temporarily
let verificationData = {
    code: null,
    contactMethod: null,
    contactInfo: null,
    formData: null,
    userId: null,
    verified: false
};

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

// Function to generate a random verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send verification code via NotificationAPI
async function sendVerificationCode(contactMethod, contactInfo) {
    try {
        // Generate a random 6-digit code
        const code = generateVerificationCode();
        
        // Store verification data
        verificationData.code = code;
        verificationData.contactMethod = contactMethod;
        verificationData.contactInfo = contactInfo;
        verificationData.userId = contactMethod === 'email' ? contactInfo : `phone_${contactInfo.replace(/\D/g, '')}`;
        
        // Prepare user data for NotificationAPI
        const user = {
            id: verificationData.userId
        };
        
        // Add contact info based on method
        if (contactMethod === 'email') {
            user.email = contactInfo;
        } else {
            user.number = contactInfo;
        }
        
        // Send verification code
        const response = await fetch(NOTIFICATION_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': NOTIFICATION_API_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notificationId: 'verification_code',
                user: user,
                mergeTags: {
                    code: code
                }
            })
        });

        if (!response.ok) {
            console.error('NotificationAPI error:', await response.text());
            return { success: false, message: 'Failed to send verification code. Please try again.' };
        }

        return { success: true, message: 'Verification code sent successfully!' };
    } catch (error) {
        console.error('Error sending verification code:', error);
        return { success: false, message: 'Error sending verification code. Please try again.' };
    }
}

// Function to verify the code entered by the user
function verifyCode(enteredCode) {
    if (enteredCode === verificationData.code) {
        verificationData.verified = true;
        return { success: true, message: 'Verification successful!' };
    } else {
        return { success: false, message: 'Invalid verification code. Please try again.' };
    }
}

// Function to handle reminder signup
async function handleReminderSignup(formData) {
    try {
        // Store form data for later use after verification
        verificationData.formData = formData;
        
        // Get contact method and info
        const contactMethod = formData.get('contactMethod');
        const contactInfo = formData.get('contactInfo');
        
        // Send verification code
        const result = await sendVerificationCode(contactMethod, contactInfo);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Return success to show verification code input
        return { 
            success: true, 
            message: 'Verification code sent! Please check your ' + 
                    (contactMethod === 'email' ? 'email' : 'phone') + 
                    ' and enter the code to complete signup.',
            showVerification: true
        };
    } catch (error) {
        console.error('Error initiating verification:', error);
        return { success: false, message: error.message || 'Error setting up verification. Please try again.' };
    }
}

// Function to complete the reminder signup after verification
async function completeReminderSignup() {
    try {
        if (!verificationData.verified) {
            return { success: false, message: 'Please verify your contact information first.' };
        }
        
        const formData = verificationData.formData;
        
        // Prepare user data for Supabase
        const userData = {
            email: verificationData.contactMethod === 'email' ? verificationData.contactInfo : formData.get('email') || '',
            fullName: formData.get('full-name') || '',
            phone: verificationData.contactMethod === 'sms' ? verificationData.contactInfo : formData.get('phone') || '',
            address: formData.get('address') || sessionStorage.getItem('address') || '',
            city: formData.get('city') || sessionStorage.getItem('city') || '',
            state: formData.get('state') || sessionStorage.getItem('state') || '',
            zipCode: formData.get('zip') || sessionStorage.getItem('zip') || '',
            isInServiceArea: sessionStorage.getItem('isInServiceArea') === 'true',
            reminderOnly: true,
            manualSchedule: true
        };

        // Create or update user profile
        const profile = await createUserProfile(userData);

        // Save service schedules
        const services = ['trash', 'recycling', 'compost'];
        for (const service of services) {
            const serviceContainer = document.getElementById(`${service}-container`);
            if (!serviceContainer) continue;
            
            const checkbox = serviceContainer.querySelector('.service-checkbox');
            if (!checkbox || !checkbox.checked) continue;
            
            const daySelect = serviceContainer.querySelector('select[id^="service-day"]');
            const frequencySelect = document.getElementById(`${service}-bin-frequency`);
            const quantityInput = document.getElementById(`${service}-quantity`);
            
            if (!daySelect || !frequencySelect) continue;
            
            // Convert pickup day to lowercase to match database constraints
            const pickupDay = daySelect.value.toLowerCase();
            
            // Convert frequency to match database constraints (lowercase, no hyphen)
            let frequency = frequencySelect.value;
            if (frequency === 'Bi-weekly') {
                frequency = 'biweekly';
            } else {
                frequency = frequency.toLowerCase();
            }
            const quantity = quantityInput ? quantityInput.value : 1;
            
            if (frequency && frequency !== 'none' && pickupDay) {
                await saveServiceSchedule({
                    profileId: profile.id,
                    type: service,
                    pickupDay: pickupDay,
                    frequency: frequency,
                    quantity: quantity,
                    startDate: document.getElementById('selected-date').textContent !== 'Select a date' 
                        ? new Date(document.getElementById('selected-date').textContent).toISOString() 
                        : new Date().toISOString()
                });
            }
        }

        // Send welcome notification
        await sendNotification({
            email: userData.email,
            phone: userData.phone,
            address_line1: userData.address,
            city: userData.city,
            state: userData.state,
            full_name: userData.fullName
        }, {
            services: 'Your garbage collection reminders'
        });

        // Reset verification data
        verificationData = {
            code: null,
            contactMethod: null,
            contactInfo: null,
            formData: null,
            userId: null,
            verified: false
        };

        return { success: true, message: 'Successfully signed up for reminders!' };
    } catch (error) {
        console.error('Error completing reminder signup:', error);
        return { success: false, message: 'Error signing up for reminders. Please try again.' };
    }
}

// Export functions
export {
    processReminders,
    handleReminderSignup,
    sendVerificationCode,
    verifyCode,
    completeReminderSignup
};