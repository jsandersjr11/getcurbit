// Pricing constants
const BASE_PRICE = 39;
const WEEKLY_PRICE = 10;
const BIWEEKLY_PRICE = 5;
const MONTHLY_PRICE = 2.50;

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
    Weekly: 10,
    'Bi-weekly': 5,
    Monthly: 2.50
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
    
    updateTotalPrice();
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
        this.recycleWeek = serviceInfo?.recycleWeek || 'none';
        this.compostWeek = serviceInfo?.compostWeek || 'none';
        
        // Set default date to next service day that's at least 1.5 weeks out
        this.setDefaultDate();

        // Elements
        this.trigger = document.getElementById('calendar-trigger');
        this.dropdown = document.getElementById('calendar-dropdown');
        this.currentMonthElement = this.dropdown.querySelector('.current-month');
        this.datesContainer = document.getElementById('calendar-dates');
        this.selectedDateElement = document.getElementById('selected-date');
        this.hiddenInput = document.getElementById('service-start-date');

        // Bind event listeners
        this.trigger.addEventListener('click', () => this.toggleDropdown());
        this.dropdown.querySelector('.prev-month').addEventListener('click', () => this.prevMonth());
        this.dropdown.querySelector('.next-month').addEventListener('click', () => this.nextMonth());
        document.addEventListener('click', (e) => this.handleClickOutside(e));

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

// Call restoreFormState when the page loads
document.addEventListener('DOMContentLoaded', restoreFormState);

// Function to handle checkout
async function handleCheckout(event) {
    console.log('Checkout process started...');
    event.preventDefault();
    
    const checkoutButton = document.getElementById('checkout-button');
    const buttonText = checkoutButton.querySelector('.button-text');
    const buttonLoading = checkoutButton.querySelector('.button-loading');
    const returnButton = document.getElementById('return-to-form');
    
    // Show loading state
    buttonText.classList.add('hidden');
    buttonLoading.classList.remove('hidden');
    checkoutButton.disabled = true;
    
    try {
        // Create line items array for Stripe Checkout
        console.log('Creating line items...');
        const lineItems = [];
        
        // Price IDs for different services and frequencies
        const priceIds = {
            base: 'price_1Qqaw2GwVRYqqGA7sZCyuVrB',    // Base fee
            trash: {
                Weekly: 'price_1QqaaCGwVRYqqGA7ZHzIxqq2',
                'Bi-weekly': 'price_1Qqad7GwVRYqqGA7d7ErdWeP',
                Monthly: 'price_1Qqai4GwVRYqqGA7lFtNSBlT'
            },
            recycling: {
                Weekly: 'price_1QqakvGwVRYqqGA7Kx9IlYK6',
                'Bi-weekly': 'price_1Qqan9GwVRYqqGA7HeiQHCO0',
                Monthly: 'price_1QqapDGwVRYqqGA7bqBEllyl'
            },
            compost: {
                Weekly: 'price_1Qqar2GwVRYqqGA7Bk7bUOm8',
                'Bi-weekly': 'price_1QqasbGwVRYqqGA7xENHMXuL',
                Monthly: 'price_1QqatzGwVRYqqGA7J5YsH3vu'
            }
        };

        // Add base price
        lineItems.push({
            price: priceIds.base,
            quantity: 1
        });

        // Handle trash bins
        const trashFrequency = document.getElementById('trash-bin-frequency').value;
        const trashQuantity = parseInt(document.getElementById('trash-quantity').value);
        
        if (trashFrequency !== 'none' && trashQuantity > 0) {
            const priceId = priceIds.trash[trashFrequency];
            if (priceId) {
                lineItems.push({
                    price: priceId,
                    quantity: trashQuantity
                });
            }
        }

        // Handle recycling bins
        const recyclingFrequency = document.getElementById('recycling-bin-frequency').value;
        const recyclingQuantity = parseInt(document.getElementById('recycling-quantity').value);
        
        if (recyclingFrequency !== 'none' && recyclingQuantity > 0) {
            const priceId = priceIds.recycling[recyclingFrequency];
            if (priceId) {
                lineItems.push({
                    price: priceId,
                    quantity: recyclingQuantity
                });
            }
        }

        // Handle compost bins
        const compostFrequency = document.getElementById('compost-bin-frequency')?.value || 'none';
        const compostQuantity = parseInt(document.getElementById('compost-quantity')?.value || '0');
        
        if (compostFrequency !== 'none' && compostQuantity > 0) {
            const priceId = priceIds.compost[compostFrequency];
            if (priceId) {
                lineItems.push({
                    price: priceId,
                    quantity: compostQuantity
                });
            }
        };

        console.log('Line items prepared:', lineItems);
        console.log('Redirecting to Stripe Checkout...');
        
        // Determine if we're in development or production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Define success and cancel URLs
        const successUrl = isLocalhost
            ? 'https://getcurbit.com/signup/success.html'  // Production success URL
            : window.location.origin + '/signup/success.html';
        const cancelUrl = isLocalhost
            ? 'https://getcurbit.com/signup/service-details.html'  // Production cancel URL
            : window.location.href;

        // Create a Checkout Session
        try {
            // Save form state before redirecting
            saveFormState();
            
            // Redirect to Stripe Checkout
            const { error } = await stripe.redirectToCheckout({
                mode: 'subscription',
                lineItems: lineItems,
                successUrl: successUrl,
                cancelUrl: cancelUrl
            });

            if (error) {
                throw error;
            }
        } catch (checkoutError) {
            console.error('Stripe Checkout Error:', checkoutError);
            
            if (checkoutError.message?.includes('domain') && isLocalhost) {
                alert('Development Environment Notice: Please use the production URL (https://getcurbit.com) for Stripe Checkout. Local development domains are not supported for security reasons.');
            } else {
                alert('There was an error initiating checkout. Please try again or contact support if the issue persists.');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        // Reset button state
        buttonText.classList.remove('hidden');
        buttonLoading.classList.add('hidden');
        checkoutButton.disabled = false;
        returnButton.classList.remove('hidden');
        
        // Show error to user
        alert(error.message || 'There was an error processing your payment. Please try again.');
    }
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
        
        // Here you would typically call your Stripe checkout function
        // stripeCheckout();
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

    function updateContactInputRequired() {
        const isVisible = !reminderOptions.classList.contains('hidden');
        const selectedMethod = document.querySelector('input[name="reminder-method"]:checked').value;
        contactInput.required = isVisible && selectedMethod === 'sms';
        contactInput.type = selectedMethod === 'sms' ? 'tel' : 'email';
        contactInput.placeholder = selectedMethod === 'sms' ? 'Enter phone number' : 'Enter email address';
    }

    wantRemindersCheckbox.addEventListener('change', () => {
        reminderOptions.classList.toggle('hidden', !wantRemindersCheckbox.checked);
        updateContactInputRequired();
    });

    reminderMethodInputs.forEach(input => {
        input.addEventListener('change', updateContactInputRequired);
    });

    
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
            // const updateDisplay = (info) => {
            //     // Update the service area message
            //     const message = document.getElementById('service-area-message');
            //     if (message) {
            //         let messageText = `Set up your can-to-curb service below. Your pickup day is ${info.pickupDay}. Trash pickup is ${info.trashFrequency.toLowerCase()}, and recycling is ${info.recycleFrequency.toLowerCase()}`;
            //         if (info.recycleWeek !== 'none') {
            //             messageText += ` on ${info.recycleWeek} weeks`;
            //         }
            //         if (info.compostFrequency !== 'none') {
            //             messageText += `. Compost pickup is ${info.compostFrequency.toLowerCase()}`;
            //             if (info.compostWeek !== 'none') {
            //                 messageText += ` on ${info.compostWeek} weeks`;
            //             }
            //         }
            //         messageText += '.';
            //         message.textContent = messageText;
            //     }
                
            // //  Show the service info display
            //     const serviceInfoDisplay = document.getElementById('service-info-display');
            //     if (serviceInfoDisplay) {
            //         let displayHtml = `
            //             <div class="grid grid-cols-1 gap-4 text-sm">
            //                 <div>
            //                     <span class="font-medium">Pickup Day:</span> ${info.pickupDay}
            //                 </div>
            //                 <div>
            //                     <span class="font-medium">Trash Service:</span> ${info.trashFrequency}
            //                 </div>
            //                 <div>
            //                     <span class="font-medium">Recycling Service:</span> ${info.recycleFrequency}`;
                    
            //         if (info.recycleWeek !== 'none') {
            //             displayHtml += ` (${info.recycleWeek} weeks)`;
            //         }
                    
            //         displayHtml += `</div>`;
                    
            //         if (info.compostFrequency !== 'none') {
            //             displayHtml += `
            //                 <div>
            //                     <span class="font-medium">Compost Service:</span> ${info.compostFrequency}`;
            //             if (info.compostWeek !== 'none') {
            //                 displayHtml += ` (${info.compostWeek} weeks)`;
            //             }
            //             displayHtml += `</div>`;
            //         }
                    
            //         displayHtml += `
            //             </div>
            //         `;
            //         serviceInfoDisplay.innerHTML = displayHtml;
            //     }
            // };
            
            // Function to update form fields
            const updateFormFields = (info) => {
                document.getElementById('service-day').value = info.pickupDay;
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
            
            // Initial display update
            updateDisplay(serviceInfo);
            updateFormFields(serviceInfo);
            
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
                            updateFormFields(originalServiceInfo);
                            
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
});
