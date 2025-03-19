// Function to initialize input steppers
function initializeStepper(stepper) {
    const input = stepper.querySelector('input[type="number"]');
    const decrement = stepper.querySelector('.decrement');
    const increment = stepper.querySelector('.increment');
    const container = stepper.closest('.service-container');
    const checkbox = container?.querySelector('.service-checkbox');
    
    // Prevent manual input of 0 when service is checked
    input.addEventListener('change', () => {
        if (checkbox?.checked && parseInt(input.value) < 1) {
            input.value = '1';
        }
    });
    
    decrement.addEventListener('click', () => {
        const currentValue = parseInt(input.value);
        // Only allow decrement to 0 if service is unchecked
        const minValue = checkbox?.checked ? 1 : parseInt(input.min);
        if (currentValue > minValue) {
            input.value = currentValue - 1;
            input.dispatchEvent(new Event('change'));
        }
    });
    
    increment.addEventListener('click', () => {
        const currentValue = parseInt(input.value);
        if (currentValue < parseInt(input.max)) {
            input.value = currentValue + 1;
            input.dispatchEvent(new Event('change'));
        }
    });
}

// Constants for pricing
const BASE_FEE = 29;
const SERVICE_PRICES = {
    'Weekly': 10,
    'Bi-weekly': 5,
    'Monthly': 2.50
};

// Service price mapping for Stripe checkout
const servicePrices = {
    'Weekly': 1000,
    'Bi-weekly': 500,
    'Monthly': 250
};

// Function to calculate price for a service
function calculateServicePrice(serviceType, frequency, quantity, isChecked) {
    if (!isChecked || frequency === 'none' || quantity === 0) return 0;
    return SERVICE_PRICES[frequency] * quantity;
}

// Function to get service day description
function getServiceDayDescription(container) {
    const daySelect = container.querySelector('select[id^="service-day"]');
    return daySelect?.value ? daySelect.value : 'No day selected';
}

// Function to update pricing display
function updatePricing() {
    const servicePricesDiv = document.getElementById('service-prices');
    const totalPriceElement = document.getElementById('total-price');
    let total = BASE_FEE;
    let priceRows = '';

    // Service types configuration
    const services = [
        { id: 'trash', emoji: '🗑️', label: 'Trash Service' },
        { id: 'recycling', emoji: '♻️', label: 'Recycling Service' },
        { id: 'compost', emoji: '🍃', label: 'Compost Service' }
    ];

    services.forEach(service => {
        const container = document.getElementById(`${service.id}-container`);
        const checkbox = container.querySelector('.service-checkbox');
        const frequency = document.getElementById(`${service.id}-bin-frequency`)?.value;
        const quantity = parseInt(document.getElementById(`${service.id}-quantity`)?.value || '0');
        const serviceDay = getServiceDayDescription(container);

        if (checkbox.checked) {
            const price = calculateServicePrice(service.id, frequency, quantity, true);
            total += price;

            priceRows += `
                <div class="price-row">
                    <span class="price-label">
                        ${service.label} 
                        (${quantity} can${quantity > 1 ? 's' : ''}, 
                        ${frequency} on ${serviceDay})
                    </span>
                    <span class="price-value">$${price.toFixed(2)}/mo</span>
                </div>`;
        }
    });

    // Update service prices display
    servicePricesDiv.innerHTML = priceRows;
    
    // Update total price
    totalPriceElement.textContent = `$${total.toFixed(2)}/mo`;
}

// Function to handle frequency changes in the service info form
function handleFrequencyChange(binType) {
    const container = document.getElementById(`${binType}-container`);
    const binFrequency = document.getElementById(`${binType}-bin-frequency`);
    
    if (binType === 'trash' && binFrequency && binFrequency.value === 'none') {
        // For trash, set quantity to 0 when no service is selected
        const quantity = document.getElementById(`${binType}-quantity`);
        if (quantity) quantity.value = '0';
    } else {
        // Initialize quantity to 1 if it was 0
        const quantity = document.getElementById(`${binType}-quantity`);
        if (quantity && quantity.value === '0') {
            quantity.value = '1';
        }
    }
    
    updatePricing();
}

// Calendar functionality
class Calendar {
    constructor() {
        this.today = new Date();
        this.currentDate = new Date();
        this.selectedDate = null;
        this.minDate = new Date();
        this.minDate.setDate(this.minDate.getDate() + 14); // Two weeks from today

        // Get service day from sessionStorage
        const serviceInfo = JSON.parse(sessionStorage.getItem('serviceInfo'));
        this.serviceDay = serviceInfo?.pickupDay || 'Monday';
        
        // Set default date to next service day that's at least 1.5 weeks out
        this.setDefaultDate();

        // Elements
        this.trigger = document.getElementById('calendar-trigger');
        this.dropdown = document.getElementById('calendar-dropdown');
        this.currentMonthElement = this.dropdown.querySelector('.current-month');
        this.datesContainer = document.getElementById('calendar-dates');
        this.selectedDateElement = document.getElementById('selected-date');
        this.hiddenInput = document.getElementById('service-start-date');

        // Bind methods
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.prevMonth = this.prevMonth.bind(this);
        this.nextMonth = this.nextMonth.bind(this);
        this.render = this.render.bind(this);
        this.selectDate = this.selectDate.bind(this);

        // Bind event listeners
        this.trigger.addEventListener('click', this.toggleDropdown);
        this.dropdown.querySelector('.prev-month').addEventListener('click', this.prevMonth);
        this.dropdown.querySelector('.next-month').addEventListener('click', this.nextMonth);
        document.addEventListener('click', this.handleClickOutside);

        // Initial render
        this.render();
        
        // Set initial selection
        if (this.selectedDate) {
            this.selectDate(this.selectedDate);
        }
    }

    toggleDropdown() {
        this.dropdown.classList.toggle('hidden');
    }

    handleClickOutside(e) {
        if (!this.dropdown.contains(e.target) && !this.trigger.contains(e.target)) {
            this.dropdown.classList.add('hidden');
        }
    }

    formatDate(date) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    setDefaultDate() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const serviceDayIndex = days.indexOf(this.serviceDay);
        
        // Start with today + 14 days (2 weeks)
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 14);
        
        // Find the next service day after the 1.5 week mark
        while (targetDate.getDay() !== serviceDayIndex) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        
        this.selectedDate = targetDate;
        this.currentDate = new Date(targetDate); // Set current month to show selected date
    }

    isDisabled(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return date < this.minDate || days[date.getDay()] !== this.serviceDay;
    }

    selectDate(date) {
        if (this.isDisabled(date)) return;
        
        this.selectedDate = date;
        this.hiddenInput.value = date.toISOString().split('T')[0];
        this.selectedDateElement.textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.render();
        this.dropdown.classList.add('hidden');
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    render() {
        // Update header
        this.currentMonthElement.textContent = this.formatDate(this.currentDate);

        // Clear dates
        this.datesContainer.innerHTML = '';

        // Get first day of month and total days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        // Add empty cells for days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyCell = document.createElement('div');
            this.datesContainer.appendChild(emptyCell);
        }

        // Add days of month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-date');
            dayElement.textContent = date;

            const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), date);

            if (this.isDisabled(currentDate)) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', () => this.selectDate(currentDate));
            }

            if (this.selectedDate && currentDate.toDateString() === this.selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }

            if (currentDate.toDateString() === this.today.toDateString()) {
                dayElement.classList.add('today');
            }

            this.datesContainer.appendChild(dayElement);
        }
    }
}

// Load Stripe.js
const stripe = Stripe('pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa');

// Function to proceed to Stripe checkout
async function proceedToStripeCheckout() {
    try {
        // Get selected services data
        const services = ['trash', 'recycling', 'compost'];
        const selectedServices = services.reduce((acc, service) => {
            const container = document.getElementById(`${service}-container`);
            const checkbox = container?.querySelector('.service-checkbox');
            
            if (checkbox?.checked) {
                const frequency = document.getElementById(`${service}-bin-frequency`).value;
                const quantity = document.getElementById(`${service}-quantity`).value;
                const serviceDay = container.querySelector('select[id^="service-day"]').value;
                
                acc[service] = { frequency, quantity, serviceDay };
            }
            return acc;
        }, {});
        
        // Get the service start date
        const startDate = document.getElementById('service-start-date').value;
        
        // Save service info to sessionStorage for success page
        sessionStorage.setItem('serviceInfo', JSON.stringify({
            services: selectedServices,
            startDate,
            reminderMethod: 'email' // Default to email reminders
        }));

        // Calculate total price in cents
        const servicePrices = {
            'Weekly': 1000, // $10.00
            'Bi-weekly': 500, // $5.00
            'Monthly': 250 // $2.50
        };

        let total = 0;

        // Add base fee for trash service
        if (selectedServices.trash) {
            total += 2900; // $29.00 base fee
        }

        // Add per-service pricing
        Object.entries(selectedServices).forEach(([service, details]) => {
            const frequency = details.frequency;
            const quantity = parseInt(details.quantity);
            const pricePerBin = servicePrices[frequency];
            total += pricePerBin * quantity;
        });

        // Create descriptive line items for display
        const items = Object.entries(selectedServices).map(([service, details]) => {
            const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
            const binText = `${details.quantity} bin${details.quantity > 1 ? 's' : ''}`;
            const pricePerBin = servicePrices[details.frequency] / 100;
            const pickupText = `${details.frequency} pickup on ${details.serviceDay}s`;
            return `${serviceName} Service: ${binText} - ${pickupText} ($${pricePerBin.toFixed(2)}/bin/month)`;
        }).join('\n');

        // Add base fee info if trash service is selected
        const description = selectedServices.trash 
            ? `Base Service Fee: $29.00/month\n${items}`
            : items;

        // Create Stripe checkout
        const result = await stripe.redirectToCheckout({
            lineItems: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Curbit Service Subscription',
                        description: description
                    },
                    unit_amount: total,
                    recurring: {
                        interval: 'month'
                    }
                },
                quantity: 1
            }],
            mode: 'subscription',
            successUrl: 'https://getcurbit.com/success?services=' + encodeURIComponent(JSON.stringify(selectedServices)) + '&startDate=' + encodeURIComponent(startDate),
            cancelUrl: 'https://getcurbit.com/signup/service-details',
            billingAddressCollection: 'required',
            shippingAddressCollection: {
                allowedCountries: ['US']
            },
            // Only include customerEmail if we have one
            ...(sessionStorage.getItem('userEmail') ? { customerEmail: sessionStorage.getItem('userEmail') } : {})
        });
        
        if (result.error) {
            console.error('Stripe Error:', result.error);
            let errorMessage = 'An error occurred. Please try again.';
            
            // Handle specific error cases
            switch (result.error.code) {
                case 'payment_intent_unexpected_state':
                    errorMessage = 'Your previous payment is still processing. Please wait a moment and try again.';
                    break;
                case 'email_invalid':
                    errorMessage = 'Please provide a valid email address.';
                    break;
                case 'expired_card':
                case 'incorrect_cvc':
                case 'card_declined':
                    errorMessage = 'There was an issue with your card. Please try a different payment method.';
                    break;
                case 'rate_limit':
                    errorMessage = 'Too many attempts. Please wait a moment and try again.';
                    break;
            }

            showErrorMessage(errorMessage);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Checkout Error:', error);
        showErrorMessage('Unable to start checkout. Please try again.');
        return false;
    }
}

// Function to save form state
function saveFormState() {
    const formState = {
        trashFrequency: document.getElementById('trash-bin-frequency').value,
        trashQuantity: document.getElementById('trash-quantity').value,
        recyclingFrequency: document.getElementById('recycling-bin-frequency').value,
        recyclingQuantity: document.getElementById('recycling-quantity').value,
        compostFrequency: document.getElementById('compost-bin-frequency')?.value || 'none',
        compostQuantity: document.getElementById('compost-quantity')?.value || '0'
    };
    localStorage.setItem('curbitFormState', JSON.stringify(formState));
}

// Function to restore form state
function restoreFormState() {
    const savedState = localStorage.getItem('curbitFormState');
    if (savedState) {
        const formState = JSON.parse(savedState);
        
        // Restore trash bin values
        document.getElementById('trash-bin-frequency').value = formState.trashFrequency;
        document.getElementById('trash-quantity').value = formState.trashQuantity;
        
        // Restore recycling bin values
        document.getElementById('recycling-bin-frequency').value = formState.recyclingFrequency;
        document.getElementById('recycling-quantity').value = formState.recyclingQuantity;
        
        // Restore compost bin values if elements exist
        const compostFreqEl = document.getElementById('compost-bin-frequency');
        const compostQtyEl = document.getElementById('compost-quantity');
        if (compostFreqEl) compostFreqEl.value = formState.compostFrequency;
        if (compostQtyEl) compostQtyEl.value = formState.compostQuantity;
        
        // Trigger any necessary UI updates
        updateTotalPrice();
    }
}

// Function to set up all event listeners
function setupEventListeners() {
    // Initialize steppers
    const steppers = document.querySelectorAll('.quantity-stepper');
    steppers.forEach(initializeStepper);
    
    // Initialize calendar
    new Calendar();
    
    // Service types configuration
    const services = ['trash', 'recycling', 'compost'];
    
    // Set up service checkbox handlers
    services.forEach(service => {
        const container = document.getElementById(`${service}-container`);
        if (container) {
            const checkbox = container.querySelector('.service-checkbox');
            const detailsContainer = container.querySelector('.service-details');
            
            // Set up checkbox change handler
            checkbox?.addEventListener('change', () => {
                toggleServiceDetails(checkbox, detailsContainer);
                updatePricing();
            });
            
            // Set up frequency change handler
            const frequency = document.getElementById(`${service}-bin-frequency`);
            frequency?.addEventListener('change', () => {
                handleFrequencyChange(service);
                updatePricing();
            });
            
            // Set up quantity change handler
            const quantity = document.getElementById(`${service}-quantity`);
            quantity?.addEventListener('change', updatePricing);
            
            // Set up service day change handler
            const daySelect = container.querySelector('select[id^="service-day"]');
            daySelect?.addEventListener('change', updatePricing);
        }
    });
    
    // Set up form submission handler
    const form = document.querySelector('form');
    form?.addEventListener('submit', handleCheckout);
    
    // Set up service day change handler for calendar
    const serviceDaySelect = document.getElementById('service-day');
    if (serviceDaySelect) {
        serviceDaySelect.addEventListener('change', updateStartDateDisplay);
    }
    
    // Set up reminder preferences handlers
    const wantRemindersCheckbox = document.getElementById('want-reminders');
    const reminderOptions = document.getElementById('reminder-options');
    if (wantRemindersCheckbox && reminderOptions) {
        wantRemindersCheckbox.addEventListener('change', () => {
            reminderOptions.classList.toggle('hidden', !wantRemindersCheckbox.checked);
            updateContactInputRequired();
        });
    }
    
    // Add reminder form toggle functionality
    const reminderButton = document.getElementById('reminderButton');
    const reminderForm = document.querySelector('.reminder-form');
    const backToServiceButtons = document.querySelectorAll('.back-to-service');

    if (reminderButton && reminderForm) {
        reminderButton.addEventListener('click', () => {
            reminderForm.classList.remove('hidden');
            reminderButton.classList.add('hidden');
        });

        backToServiceButtons.forEach(button => {
            button.addEventListener('click', () => {
                reminderForm.classList.add('hidden');
                reminderButton.classList.remove('hidden');
            });
        });
    }
    
    // Initial price update
    updatePricing();
    
    // Initialize start date display
    updateStartDateDisplay();
}

// Call restoreFormState and setup event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    restoreFormState();
    setupEventListeners();

    // Setup reminder button functionality
    const reminderButton = document.getElementById('reminderButton');
    const signupForm = document.getElementById('service-form');
    const signupSection = document.querySelector('.signup-section');
    const reminderForm = document.querySelector('.reminder-form');
    const backToServiceButton = document.querySelector('.back-to-service');

    if (reminderButton && signupForm && reminderForm) {
        reminderButton.addEventListener('click', () => {
            // Hide only specific sections
            document.querySelector('.start-date-section')?.classList.add('hidden');
            document.querySelector('.pricing-section')?.classList.add('hidden');
            document.querySelector('#checkout-button')?.classList.add('hidden');
            signupSection.classList.add('hidden');
            reminderForm.classList.remove('hidden');
        });

        backToServiceButton.addEventListener('click', () => {
            reminderForm.classList.add('hidden');
            // Show the previously hidden sections
            document.querySelector('.start-date-section')?.classList.remove('hidden');
            document.querySelector('.pricing-section')?.classList.remove('hidden');
            document.querySelector('#checkout-button')?.classList.remove('hidden');
            signupSection.classList.remove('hidden');
        });

        // Handle contact method change
        const contactMethodInputs = document.querySelectorAll('input[name="contactMethod"]');
        const contactInfoInput = document.getElementById('contactInfo');

        const contactLabel = document.querySelector('label[for="contactInfo"]');
        
        contactMethodInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (input.value === 'email') {
                    contactInfoInput.type = 'email';
                    contactInfoInput.placeholder = 'email@example.com';
                    contactLabel.textContent = 'Email Address';
                    document.querySelector('.sms-disclaimer').classList.add('hidden');
                } else {
                    contactInfoInput.type = 'tel';
                    contactInfoInput.placeholder = '(555) 555-5555';
                    contactLabel.textContent = 'Phone Number';
                    document.querySelector('.sms-disclaimer').classList.remove('hidden');
                }
            });
        });
        
        // Set initial label based on default selected radio button
        const initialMethod = document.querySelector('input[name="contactMethod"]:checked');
        if (initialMethod) {
            contactLabel.textContent = initialMethod.value === 'email' ? 'Email Address' : 'Phone Number';
        }
    }
});

// Supabase Integration
async function createUserProfile(userData) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .insert([{
                full_name: userData.fullName,
                email: userData.email,
                phone: userData.phone,
                address_line1: userData.address,
                city: userData.city,
                state: userData.state,
                zip_code: userData.zipCode,
                is_in_service_area: userData.isInServiceArea,
                reminder_only: userData.reminderOnly
            }])
            .select()
            .single();

        if (error) throw error;
        return profile;
    } catch (error) {
        console.error('Error creating profile:', error);
        throw error;
    }
}

async function createServiceSchedule(profileId, serviceData) {
    try {
        const { data: schedule, error } = await supabase
            .from('service_schedules')
            .insert([{
                profile_id: profileId,
                service_type: serviceData.type,
                pickup_day: serviceData.pickupDay,
                frequency: serviceData.frequency,
                start_date: serviceData.startDate,
                is_override: serviceData.isOverride,
                original_radar_schedule: serviceData.originalSchedule
            }])
            .select();

        if (error) throw error;
        return schedule;
    } catch (error) {
        console.error('Error creating service schedule:', error);
        throw error;
    }
}

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
        console.error('Error creating subscription:', error);
        throw error;
    }
}

// Function to handle checkout
async function handleCheckout(event) {
    event.preventDefault();
    
    // Show loading state
    const checkoutButton = document.getElementById('checkout-button');
    checkoutButton.querySelector('.button-text').classList.add('hidden');
    checkoutButton.querySelector('.button-loading').classList.remove('hidden');
    
    try {
        // Get form data
        const formData = new FormData(event.target);
        const userData = {
            fullName: formData.get('full-name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zip'),
            isInServiceArea: sessionStorage.getItem('isInServiceArea') === 'true',
            reminderOnly: document.getElementById('want-reminders').checked && !hasActiveServices()
        };
        
        // Save email to sessionStorage for Stripe checkout
        if (userData.email) {
            sessionStorage.setItem('userEmail', userData.email);
        }

        // Create user profile
        const profile = await createUserProfile(userData);

        // If user wants reminders, create service schedules
        if (document.getElementById('want-reminders').checked) {
            const services = ['trash', 'recycling', 'compost'];
            
            for (const service of services) {
                const container = document.getElementById(`${service}-container`);
                const daySelect = container.querySelector('select[id^="service-day"]');
                const frequencySelect = document.getElementById(`${service}-bin-frequency`);
                
                if (daySelect && frequencySelect) {
                    await createServiceSchedule(profile.id, {
                        type: service,
                        pickupDay: daySelect.value,
                        frequency: frequencySelect.value,
                        startDate: document.getElementById('service-start-date').value,
                        isOverride: false,
                        originalSchedule: null
                    });
                }
            }
        }

        // If user is signing up for service, create service subscriptions
        if (hasActiveServices()) {
            const services = ['trash', 'recycling', 'compost'];
            
            for (const service of services) {
                const container = document.getElementById(`${service}-container`);
                const checkbox = container.querySelector('.service-checkbox');
                const quantity = document.getElementById(`${service}-quantity`);
                
                if (checkbox.checked && quantity) {
                    await createServiceSubscription(profile.id, {
                        type: service,
                        quantity: parseInt(quantity.value),
                        startDate: document.getElementById('service-start-date').value
                    });
                }
            }
            
            // Proceed with Stripe checkout
            await proceedToStripeCheckout();
            return;
        }

        // Show success message for reminder-only signup
        showSuccessMessage('You have successfully signed up for reminders!');
        
    } catch (error) {
        console.error('Error during signup:', error);
        showErrorMessage('There was an error processing your request. Please try again.');
    } finally {
        // Reset button state
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.querySelector('.button-text').classList.remove('hidden');
            checkoutButton.querySelector('.button-loading').classList.add('hidden');
        }
    }
}

// Helper function to check if any services are selected
function hasActiveServices() {
    return ['trash', 'recycling', 'compost'].some(service => {
        const container = document.getElementById(`${service}-container`);
        return container.querySelector('.service-checkbox').checked;
    });
}

// Helper functions for user feedback
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    document.querySelector('form').appendChild(messageDiv);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    document.querySelector('form').appendChild(messageDiv);
}

// Function to handle return to form
function handleReturnToForm() {
    const returnButton = document.getElementById('return-to-form');
    returnButton.classList.add('hidden');
}

// Function to update the start date display
function updateStartDateDisplay() {
    const serviceDaySelect = document.getElementById('service-day');
    const startDateSpan = document.getElementById('start-date');
    const startDateContainer = startDateSpan?.closest('.subtitle');
    
    if (serviceDaySelect && startDateSpan && startDateContainer) {
        if (serviceDaySelect.value) {
            startDateSpan.textContent = serviceDaySelect.value + 's';
            startDateContainer.classList.remove('hidden');
        } else {
            startDateContainer.classList.add('hidden');
        }
    }
}

// Function to toggle service details visibility and manage quantity
function toggleServiceDetails(checkbox, detailsContainer) {
    // Get the service container and related elements
    const container = checkbox.closest('.service-container');
    const serviceId = container.id.replace('-container', '');
    const quantityInput = document.getElementById(`${serviceId}-quantity`);
    const frequencySelect = document.getElementById(`${serviceId}-bin-frequency`);
    const serviceDaySelect = container.querySelector('select[id^="service-day"]');
    
    // Get all form elements in the container
    const formElements = container.querySelectorAll('select, input[type="number"]');
    
    if (checkbox.checked) {
        // When checked:
        detailsContainer.style.display = 'flex';
        
        // Enable all form elements
        formElements.forEach(element => {
            element.disabled = false;
        });
        
        // 1. Ensure quantity is at least 1
        if (quantityInput && parseInt(quantityInput.value) < 1) {
            quantityInput.value = '1';
        }
        
        // 2. Set frequency to Weekly
        if (frequencySelect) {
            frequencySelect.value = 'Weekly';
        }
        
        // 3. Match the trash service day if this isn't the trash container
        if (serviceId !== 'trash' && serviceDaySelect) {
            const trashContainer = document.getElementById('trash-container');
            const trashDaySelect = trashContainer?.querySelector('select[id^="service-day"]');
            if (trashDaySelect?.value) {
                serviceDaySelect.value = trashDaySelect.value;
            }
        }
    } else {
        // When unchecked:
        detailsContainer.style.display = 'none';
        
        // Disable and reset all form elements
        formElements.forEach(element => {
            element.disabled = true;
            element.required = false;
            
            if (element.tagName === 'SELECT') {
                element.value = element.id.includes('frequency') ? 'none' : '';
            } else if (element.type === 'number') {
                element.value = '0';
            }
        });
    }
    
    // Update pricing
    updatePricing();
}

// Function to set service details from Radar data
function setServiceDetailsFromRadar() {
    const serviceInfo = JSON.parse(sessionStorage.getItem('serviceInfo') || '{}');
    
    // Setup service containers
    const services = [
        {
            id: 'trash',
            dayKey: 'pickupDay',
            frequencyKey: 'trashFrequency'
        },
        {
            id: 'recycling',
            dayKey: 'recycleDay',
            frequencyKey: 'recycleFrequency'
        },
        {
            id: 'compost',
            dayKey: 'compostDay',
            frequencyKey: 'compostFrequency'
        }
    ];
    
    services.forEach(service => {
        const container = document.getElementById(`${service.id}-container`);
        if (container) {
            const checkbox = container.querySelector('.service-checkbox');
            const details = container.querySelector('.service-details');
            const daySelect = details?.querySelector('select[id^="service-day"]');
            const frequencySelect = details?.querySelector(`select[id$="bin-frequency"]`);
            
            if (checkbox && details && daySelect && frequencySelect) {
                // Set frequency if available
                const frequency = serviceInfo[service.frequencyKey];
                if (frequency && frequency !== 'none') {
                    checkbox.checked = true;
                    frequencySelect.value = frequency;
                }
                
                // Set service day if available
                const serviceDay = serviceInfo[service.dayKey];
                if (serviceDay && serviceDay !== 'none') {
                    daySelect.value = serviceDay;
                }
                
                // Show/hide details based on checkbox state
                toggleServiceDetails(checkbox, details);
                
                // Add change event listener
                checkbox.addEventListener('change', () => {
                    toggleServiceDetails(checkbox, details);
                });
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize service details from Radar data
    setServiceDetailsFromRadar();
    
    // Set up pricing update listeners
    const services = ['trash', 'recycling', 'compost'];
    
    services.forEach(service => {
        const container = document.getElementById(`${service}-container`);
        if (container) {
            // Listen for checkbox changes
            const checkbox = container.querySelector('.service-checkbox');
            checkbox?.addEventListener('change', () => {
                updatePricing();
                // Disable/enable form elements based on checkbox state
                const formElements = container.querySelectorAll('select, input[type="number"]');
                formElements.forEach(element => {
                    if (checkbox.checked) {
                        element.required = true;
                    } else {
                        element.required = false;
                        element.setCustomValidity('');
                    }
                });
            });
            
            // Listen for frequency changes
            const frequency = document.getElementById(`${service}-bin-frequency`);
            frequency?.addEventListener('change', updatePricing);
            
            // Listen for quantity changes
            const quantity = document.getElementById(`${service}-quantity`);
            quantity?.addEventListener('change', updatePricing);
            
            // Listen for service day changes
            const daySelect = container.querySelector('select[id^="service-day"]');
            daySelect?.addEventListener('change', updatePricing);
        }
    });
    
    // Initial price update
    updatePricing();

    // Set up form submission handler
    const form = document.querySelector('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if at least one service is selected
        const hasSelectedService = services.some(service => {
            const container = document.getElementById(`${service}-container`);
            return container?.querySelector('.service-checkbox')?.checked;
        });
        
        if (!hasSelectedService) {
            showError('Please select at least one service.');
            return;
        }
        
        // Validate only checked services
        let isValid = true;
        services.forEach(service => {
            const container = document.getElementById(`${service}-container`);
            const checkbox = container?.querySelector('.service-checkbox');
            
            if (checkbox?.checked) {
                const daySelect = container.querySelector('select[id^="service-day"]');
                const frequency = document.getElementById(`${service}-bin-frequency`);
                
                if (!daySelect?.value || frequency?.value === 'none') {
                    isValid = false;
                    showError(`Please complete all fields for ${service} service.`);
                }
            }
        });
        
        if (!isValid) return;
        
        // If form is valid, proceed with checkout
        const checkoutButton = document.getElementById('checkout-button');
        checkoutButton.querySelector('.button-text').classList.add('hidden');
        checkoutButton.querySelector('.button-loading').classList.remove('hidden');
        
        // Get selected services data
        const selectedServices = services.reduce((acc, service) => {
            const container = document.getElementById(`${service}-container`);
            const checkbox = container?.querySelector('.service-checkbox');
            
            if (checkbox?.checked) {
                const frequency = document.getElementById(`${service}-bin-frequency`).value;
                const quantity = document.getElementById(`${service}-quantity`).value;
                const serviceDay = container.querySelector('select[id^="service-day"]').value;
                
                acc[service] = { frequency, quantity, serviceDay };
            }
            return acc;
        }, {});
        
        // Get the service start date
        const startDate = document.getElementById('service-start-date').value;
        
        // Initialize Stripe
        const stripe = Stripe('pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa');

        // Calculate total price in cents
        const servicePrices = {
            'Weekly': 1000, // $10.00
            'Bi-weekly': 500, // $5.00
            'Monthly': 250 // $2.50
        };

        let total = 0;

        // Add base fee for trash service
        if (selectedServices.trash) {
            total += 2900; // $29.00 base fee
        }

        // Add per-service pricing
        Object.entries(selectedServices).forEach(([service, details]) => {
            const frequency = details.frequency;
            const quantity = parseInt(details.quantity);
            const pricePerBin = servicePrices[frequency];
            total += pricePerBin * quantity;
        });

        // Create descriptive line items for display
        const items = Object.entries(selectedServices).map(([service, details]) => {
            const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
            const binText = `${details.quantity} bin${details.quantity > 1 ? 's' : ''}`;
            const pricePerBin = servicePrices[details.frequency] / 100;
            const pickupText = `${details.frequency} pickup on ${details.serviceDay}s`;
            return `${serviceName} Service: ${binText} - ${pickupText} ($${pricePerBin.toFixed(2)}/bin/month)`;
        }).join('\n');

        // Add base fee info if trash service is selected
        const description = selectedServices.trash 
            ? `Base Service Fee: $29.00/month\n${items}`
            : items;

        // Create Stripe checkout
        stripe.redirectToCheckout({
            lineItems: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Curbit Service Subscription',
                        description: description
                    },
                    unit_amount: total,
                    recurring: {
                        interval: 'month'
                    }
                },
                quantity: 1
            }],
            mode: 'subscription',
            successUrl: 'https://getcurbit.com/success?services=' + encodeURIComponent(JSON.stringify(selectedServices)) + '&startDate=' + encodeURIComponent(startDate),
            cancelUrl: 'https://getcurbit.com/signup/service-details',
            billingAddressCollection: 'required',
            shippingAddressCollection: {
                allowedCountries: ['US']
            },
            // Only include customerEmail if we have one
            ...(sessionStorage.getItem('userEmail') ? { customerEmail: sessionStorage.getItem('userEmail') } : {})
        })
        .then(function(result) {
            if (result.error) {
                console.error('Stripe Error:', result.error);
                let errorMessage = 'An error occurred. Please try again.';
                
                // Handle specific error cases
                switch (result.error.code) {
                    case 'payment_intent_unexpected_state':
                        errorMessage = 'Your previous payment is still processing. Please wait a moment and try again.';
                        break;
                    case 'email_invalid':
                        errorMessage = 'Please provide a valid email address.';
                        break;
                    case 'expired_card':
                    case 'incorrect_cvc':
                    case 'card_declined':
                        errorMessage = 'There was an issue with your card. Please try a different payment method.';
                        break;
                    case 'rate_limit':
                        errorMessage = 'Too many attempts. Please wait a moment and try again.';
                        break;
                }

                showError(errorMessage);
            }
        })
        .catch(function(error) {
            console.error('Checkout Error:', error);
            showError('Unable to start checkout. Please try again.');
        })
        .finally(function() {
            // Always reset button state
            checkoutButton.querySelector('.button-text').classList.remove('hidden');
            checkoutButton.querySelector('.button-loading').classList.add('hidden');
        });
    });
    
    // Set up checkout button handler
    const checkoutButton = document.getElementById('checkout-button');
    const returnButton = document.getElementById('return-to-form');
    
    // Set up service day change handler
    const serviceDaySelect = document.getElementById('service-day');
    if (serviceDaySelect) {
        serviceDaySelect.addEventListener('change', updateStartDateDisplay);
        // Initialize the display
        updateStartDateDisplay();
    }

    // Handle reminder preferences
    const wantRemindersCheckbox = document.getElementById('want-reminders');
    const reminderOptions = document.getElementById('reminder-options');
    const contactInput = document.getElementById('contact-info');
    const reminderMethodInputs = document.querySelectorAll('input[name="reminder-method"]');

    // Only set up reminder functionality if elements exist
    if (wantRemindersCheckbox && reminderOptions && contactInput && reminderMethodInputs.length > 0) {
        function updateContactInputRequired() {
            const isVisible = !reminderOptions.classList.contains('hidden');
            const selectedMethod = document.querySelector('input[name="reminder-method"]:checked')?.value;
            if (selectedMethod) {
                contactInput.required = isVisible && selectedMethod === 'sms';
                contactInput.type = selectedMethod === 'sms' ? 'tel' : 'email';
                contactInput.placeholder = selectedMethod === 'sms' ? 'Enter phone number' : 'Enter email address';
            }
        }

        wantRemindersCheckbox.addEventListener('change', () => {
            reminderOptions.classList.toggle('hidden', !wantRemindersCheckbox.checked);
            updateContactInputRequired();
        });

        reminderMethodInputs.forEach(input => {
            input.addEventListener('change', updateContactInputRequired);
        });
    }

    
    if (checkoutButton) {
        const form = checkoutButton.closest('form');
        form.addEventListener('submit', handleCheckout);
    }
    
    if (returnButton) {
        returnButton.addEventListener('click', handleReturnToForm);
    }
    
    // Display checked address
    const addressData = JSON.parse(localStorage.getItem('addressData'));
    if (addressData?.address) {
        const checkedAddressElement = document.getElementById('checked-address');
        if (checkedAddressElement) {
            checkedAddressElement.textContent = addressData.address;
        }
    }

    // Initialize calendar
    new Calendar();


    // Initialize frequency change handlers with a delay
    setTimeout(() => {
        ['trash', 'recycling', 'compost'].forEach(binType => {
            const binFrequency = document.getElementById(`${binType}-bin-frequency`);
            if (binFrequency) {
                binFrequency.addEventListener('change', () => handleFrequencyChange(binType));
                // Initialize visibility state
                handleFrequencyChange(binType);
            }
        });
    }, 500); // Add a 500ms delay to allow other initialization to complete

    let originalServiceInfo = null;
    // Initialize all steppers
    const steppers = document.querySelectorAll('.input-stepper');
    steppers.forEach(initializeStepper);
    
    // Add change event listeners for quantities and frequencies
    const quantityInputs = document.querySelectorAll('.input-stepper input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', updateTotalPrice);
    });
    
    // Add listeners for form frequency selects
    const formFrequencySelects = document.querySelectorAll('select[id$="-frequency"]');
    formFrequencySelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const binType = e.target.id.replace('-frequency', '');
            handleFrequencyChange(binType);
        });
    });
    
    // Add listeners for bin frequency selects in #bin-quantities
    const binFrequencySelects = document.querySelectorAll('#bin-quantities select[id$="-bin-frequency"]');
    binFrequencySelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const binType = e.target.id.replace('-bin-frequency', '');
            const formFrequency = document.getElementById(`${binType}-frequency`);
            formFrequency.value = e.target.value;
            handleFrequencyChange(binType);
        });
    });
    
    // Initial setup for each bin type
    ['trash', 'recycling', 'compost'].forEach(binType => {
        handleFrequencyChange(binType);
    });
    
    // Try to load service info from sessionStorage
    const serviceInfo = JSON.parse(sessionStorage.getItem('serviceInfo'));
    if (serviceInfo) {
        // Store the original service info for cancel functionality
        originalServiceInfo = { ...serviceInfo };
        
        const serviceForm = document.getElementById('service-form');
        if (serviceForm) {
            // Show the service details section
            document.getElementById('service-details').classList.remove('hidden');
            
            // Function to update the display with current values
            const updateDisplay = (info) => {
                document.getElementById('service-day').value = info.pickupDay;
                // Display the checked address
                const checkedAddress = document.getElementById('checked-address');
                if (checkedAddress && info.address) {
                    checkedAddress.textContent = info.address;
                }
                
                // Set the service start date to the next occurrence of the pickup day
                const startDate = document.getElementById('service-start-date');
                if (startDate) {
                    const today = new Date();
                    // Set minimum date to tomorrow
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    startDate.min = tomorrow.toISOString().split('T')[0];
                    // Set initial value to tomorrow if not already set
                    if (!startDate.value) {
                        startDate.value = tomorrow.toISOString().split('T')[0];
                    }
                }
                document.getElementById('trash-bin-frequency').value = info.trashFrequency;
                document.getElementById('recycling-bin-frequency').value = info.recycleFrequency;
            };
            
            // Function to generate schedule summary
            function generateScheduleSummary() {
                const schedules = [];
                
                // Check each service type
                const services = [
                    { id: 'trash', emoji: '🗑️', label: 'Trash' },
                    { id: 'recycling', emoji: '♻️', label: 'Recycling' },
                    { id: 'compost', emoji: '🍃', label: 'Compost' }
                ];

                services.forEach(service => {
                    const container = document.getElementById(`${service.id}-container`);
                    const checkbox = container.querySelector('.service-checkbox');
                    
                    if (checkbox.checked) {
                        const serviceDay = container.querySelector('select[id^="service-day"]').value;
                        const frequency = document.getElementById(`${service.id}-bin-frequency`).value;
                        const quantity = document.getElementById(`${service.id}-quantity`).value;
                        
                        if (serviceDay && frequency !== 'none') {
                            const frequencyLabel = frequency.toLowerCase();
                            schedules.push(
                                `${service.emoji} ${service.label}: ${quantity} can${quantity > 1 ? 's' : ''}, ` +
                                `${serviceDay}s ${frequencyLabel}`
                            );
                        }
                    }
                });

                return schedules;
            }

            // Function to show confirmation modal
            function showConfirmationModal(event) {
                event.preventDefault();
                const schedules = generateScheduleSummary();
                if (schedules.length === 0) {
                    showErrorMessage('Please select at least one service schedule');
                    return;
                }

                const modal = document.getElementById('confirmation-modal');
                const scheduleSummary = modal.querySelector('.schedule-summary');
                scheduleSummary.innerHTML = schedules.map(schedule => `<p>${schedule}</p>`).join('');
                modal.classList.remove('hidden');
            }

            // Function to handle reminder signup
            async function handleReminderSignup() {
                try {
                    const services = [];
                    ['trash', 'recycling', 'compost'].forEach(serviceType => {
                        const container = document.getElementById(`${serviceType}-container`);
                        const checkbox = container.querySelector('.service-checkbox');
                        
                        if (checkbox.checked) {
                            const serviceDay = container.querySelector('select[id^="service-day"]').value;
                            const frequency = document.getElementById(`${serviceType}-bin-frequency`).value;
                            if (serviceDay && frequency !== 'none') {
                                services.push({
                                    type: serviceType,
                                    pickupDay: serviceDay.toLowerCase(),
                                    frequency: frequency === 'Bi-weekly' ? 'biweekly' : frequency.toLowerCase(),
                                    startDate: document.getElementById('service-start-date').value
                                });
                            }
                        }
                    });

                    if (services.length === 0) {
                        showErrorMessage('Please select at least one service');
                        return;
                    }

                    const result = await handleReminderSignup({
                        services,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        fullName: document.getElementById('full-name').value,
                        address: document.getElementById('address').value,
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        zipCode: document.getElementById('zip').value
                    });
                    
                    if (result.success) {
                        showSuccessMessage('Successfully signed up for reminders!');
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 2000);
                    } else {
                        showErrorMessage(result.message || 'Error signing up for reminders');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('An unexpected error occurred');
                }
            }

            // Add event listeners for modal buttons
            document.getElementById('edit-schedule').addEventListener('click', () => {
                document.getElementById('confirmation-modal').classList.add('hidden');
            });

            document.getElementById('confirm-schedule').addEventListener('click', async () => {
                document.getElementById('confirmation-modal').classList.add('hidden');
                await handleReminderSignup();
            });

            // Add submit event listener to the form
            document.getElementById('reminderForm').addEventListener('submit', showConfirmationModal);

            // Initial display update
            updateDisplay(serviceInfo);
            
            // Initial price calculation
            updateTotalPrice();
            
            // Handle edit button click
            const editButton = document.getElementById('edit-service-info');
            const serviceInfoDisplay = document.getElementById('service-info-display');
            const serviceInfoForm = document.getElementById('bin-quantities');
            
            if (editButton && serviceInfoDisplay && serviceInfoForm) {
                editButton.addEventListener('click', () => {
                    // Hide display and show form
                    serviceInfoDisplay.classList.add('hidden');
                    serviceInfoForm.classList.remove('hidden');
                    editButton.classList.add('hidden');
                    
                    // Add save and cancel buttons if they don't exist
                    if (!document.getElementById('save-service-info')) {
                        const buttonContainer = document.createElement('div');
                        buttonContainer.className = 'flex gap-4 mt-4';
                        buttonContainer.innerHTML = `
                            <button type="button" id="save-service-info" class="primary flex-1">Save Changes</button>
                            <button type="button" id="cancel-service-info" class="secondary flex-1">Cancel</button>
                        `;
                        serviceInfoForm.appendChild(buttonContainer);
                        
                        // Handle save button click
                        document.getElementById('save-service-info').addEventListener('click', () => {
                            const newInfo = {
                                pickupDay: document.getElementById('service-day').value,
                                trashFrequency: document.getElementById('trash-bin-frequency').value,
                                recycleFrequency: document.getElementById('recycling-bin-frequency').value
                            };
                            
                            // Update the display and storage
                            updateDisplay(newInfo);
                            sessionStorage.setItem('serviceInfo', JSON.stringify(newInfo));
                            
                            // Show display and hide form
                            serviceInfoDisplay.classList.remove('hidden');
                            serviceInfoForm.classList.add('hidden');
                            editButton.classList.remove('hidden');
                        });
                        
                        // Handle cancel button click
                        document.getElementById('cancel-service-info').addEventListener('click', () => {
                            // Restore original values
                            updateDisplay(originalServiceInfo);
                            
                            // Show display and hide form
                            serviceInfoDisplay.classList.remove('hidden');
                            serviceInfoForm.classList.add('hidden');
                            editButton.classList.remove('hidden');
                        });
                    }
                });
            }
        }
    } else {
        // If no service info is found, redirect back to the address check page
        window.location.href = '/';
    }

    // Event listeners for reminder form are now set up in the setupEventListeners function
});
