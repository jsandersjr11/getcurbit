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
    const trashFrequency = document.getElementById('trash-frequency').value;
    const recyclingFrequency = document.getElementById('recycling-frequency').value;
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
    const frequencySelect = container.querySelector('.frequency-select');
    const formFrequency = document.getElementById(`${binType}-frequency`);
    const quantity = document.getElementById(`${binType}-quantity`);
    const binFrequency = document.getElementById(`${binType}-bin-frequency`);
    
    const value = formFrequency.value;
    
    if (value === '' || value === 'none') {
        // Hide stepper, show frequency select
        stepper.classList.add('hidden');
        frequencySelect.classList.remove('hidden');
        quantity.value = '0';
        binFrequency.value = 'none';
    } else {
        // Show stepper, hide frequency select
        stepper.classList.remove('hidden');
        frequencySelect.classList.add('hidden');
        if (quantity.value === '0') {
            quantity.value = '1';
        }
    }
    
    updateTotalPrice();
}

document.addEventListener('DOMContentLoaded', () => {
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
                    message.textContent = `Your pickup day is ${info.pickupDay}. Trash pickup is ${info.trashFrequency.toLowerCase()}, and recycling is ${info.recycleFrequency.toLowerCase()}.`;
                }
                
                // Show the service info display
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
                document.getElementById('trash-frequency').value = info.trashFrequency;
                document.getElementById('recycling-frequency').value = info.recycleFrequency;
            };
            
            // Initial display update
            updateDisplay(serviceInfo);
            updateFormFields(serviceInfo);
            
            // Initial price calculation
            updateTotalPrice();
            
            // Handle edit button click
            const editButton = document.getElementById('edit-service-info');
            const serviceInfoDisplay = document.getElementById('service-info-display');
            const serviceInfoForm = document.getElementById('service-info-form');
            
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
                                trashFrequency: document.getElementById('trash-frequency').value,
                                recycleFrequency: document.getElementById('recycling-frequency').value
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
