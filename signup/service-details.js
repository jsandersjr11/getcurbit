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
    
    decrement.addEventListener('click', () => {
        const currentValue = parseInt(input.value);
        if (currentValue > parseInt(input.min)) {
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

// Function to calculate price based on frequency and quantity
function calculatePrice(frequency, quantity) {
    if (quantity === 0 || frequency === 'none') return 0;
    
    switch (frequency) {
        case 'Weekly':
            return WEEKLY_PRICE * quantity;
        case 'Bi-weekly':
            return BIWEEKLY_PRICE * quantity;
        case 'Monthly':
            return MONTHLY_PRICE * quantity;
        default:
            return 0;
    }
}

// Function to update total price
function updateTotalPrice() {
    const trashFrequency = document.getElementById('trash-bin-frequency').value;
    const recyclingFrequency = document.getElementById('recycling-bin-frequency').value;
    const compostFrequency = document.getElementById('compost-frequency')?.value || 'Weekly';
    
    const trashQuantity = parseInt(document.getElementById('trash-quantity').value) - 1; // Subtract 1 for base price
    const recyclingQuantity = parseInt(document.getElementById('recycling-quantity').value);
    const compostQuantity = parseInt(document.getElementById('compost-quantity').value);
    
    let total = BASE_PRICE; // Base price for first trash can
    
    // Add additional trash cans
    total += calculatePrice(trashFrequency, trashQuantity);
    
    // Add recycling
    total += calculatePrice(recyclingFrequency, recyclingQuantity);
    
    // Add compost
    total += calculatePrice(compostFrequency, compostQuantity);
    
    // Update the price display
    const totalPriceElement = document.getElementById('total-price');
    totalPriceElement.textContent = `Total: $${total.toFixed(2)}/month`;
}

// Function to handle frequency changes in the service info form
function handleFrequencyChange(binType) {
    const container = document.getElementById(`${binType}-container`);
    const stepper = container.querySelector('.input-stepper');
    const binFrequency = document.getElementById(`${binType}-bin-frequency`);
    
    if (binFrequency && binFrequency.value === 'none') {
        // Hide stepper when 'none' is selected
        stepper?.classList.add('hidden');
        if (binType === 'trash') {
            // For trash, set quantity to 0 when no service is selected
            const quantity = document.getElementById(`${binType}-quantity`);
            if (quantity) quantity.value = '0';
        }
    } else {
        // Show stepper for any other frequency
        stepper?.classList.remove('hidden');
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

document.addEventListener('DOMContentLoaded', () => {
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
                // Update the service area message
                const message = document.getElementById('service-area-message');
                if (message) {
                    message.textContent = `Set up your can-to-curb service below. Your pickup day is ${info.pickupDay}. Trash pickup is ${info.trashFrequency.toLowerCase()}, and recycling is ${info.recycleFrequency.toLowerCase()}.`;
                }
                
            //  Show the service info display
                const serviceInfoDisplay = document.getElementById('service-info-display');
                if (serviceInfoDisplay) {
                    serviceInfoDisplay.innerHTML = `
                        <div class="grid grid-cols-1 gap-4 text-sm">
                            <div>
                                <span class="font-medium">Pickup Day:</span> ${info.pickupDay}
                            </div>
                            <div>
                                <span class="font-medium">Trash Service:</span> ${info.trashFrequency}
                            </div>
                            <div>
                                <span class="font-medium">Recycling Service:</span> ${info.recycleFrequency}
                            </div>
                        </div>
                    `;
                }
            };
            
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
