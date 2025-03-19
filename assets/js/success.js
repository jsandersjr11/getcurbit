document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const servicesJson = urlParams.get('services');
    const startDate = urlParams.get('startDate');
    const sessionId = urlParams.get('session_id'); // Stripe session ID if available

    if (!servicesJson && !sessionId) {
        showError('Unable to retrieve service information');
        return;
    }

    try {
        let services;
        
        if (servicesJson) {
            // Direct data from URL parameters
            services = JSON.parse(servicesJson);
            showSuccess(services);
            
            // Store service info in sessionStorage for later use
            sessionStorage.setItem('serviceInfo', JSON.stringify({
                services,
                startDate,
                reminderMethod: 'email' // Default to email reminders
            }));
        } else if (sessionId) {
            // We have a Stripe session ID but no services data
            // This could happen when redirected from Stripe
            showLoading('Retrieving your subscription details...');
            
            try {
                // Could fetch session details from server if needed
                // For now, use any stored data from sessionStorage
                const storedInfo = sessionStorage.getItem('serviceInfo');
                if (storedInfo) {
                    const parsedInfo = JSON.parse(storedInfo);
                    services = parsedInfo.services;
                    showSuccess(services);
                } else {
                    showError('Unable to retrieve service details');
                }
            } catch (fetchError) {
                console.error('Error fetching session details:', fetchError);
                showError('Unable to retrieve subscription details');
            }
        }
    } catch (error) {
        console.error('Error processing subscription:', error);
        showError('There was a problem processing your subscription');
    }
});

function showSuccess(services) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('success').classList.remove('hidden');

    // Display service summary with pricing
    const summaryDiv = document.querySelector('.service-summary');
    const servicePrices = {
        'Weekly': 10.00,
        'Bi-weekly': 5.00,
        'Monthly': 2.50
    };

    if (!services || Object.keys(services).length === 0) {
        summaryDiv.innerHTML = '<div class="p-4 bg-yellow-50 text-yellow-800 rounded-lg">No service details available. Your subscription has been confirmed, but we couldn\'t display the details.</div>';
        return;
    }

    let totalMonthlyPrice = 0;
    const serviceList = Object.entries(services).map(([type, details]) => {
        const serviceName = type.charAt(0).toUpperCase() + type.slice(1);
        const pricePerBin = servicePrices[details.frequency];
        const quantity = parseInt(details.quantity);
        const totalPrice = pricePerBin * quantity;
        const baseFee = type === 'trash' ? 29.00 : 0;
        
        totalMonthlyPrice += totalPrice + baseFee;

        return `
            <div class="service-item bg-white p-4 rounded-lg shadow-sm">
                <h3 class="text-lg font-semibold">${serviceName} Service</h3>
                <div class="mt-2 space-y-1 text-gray-600">
                    <p>${quantity} bin${quantity > 1 ? 's' : ''} - ${details.frequency} pickup on ${details.serviceDay}s</p>
                    <p class="text-sm">$${pricePerBin.toFixed(2)}/bin/month × ${quantity} = $${totalPrice.toFixed(2)}/month</p>
                    ${baseFee ? `<p class="text-sm">Base Service Fee: $${baseFee.toFixed(2)}/month</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add total monthly price
    const totalPriceHtml = `
        <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex justify-between items-center">
                <span class="font-semibold">Total Monthly Price:</span>
                <span class="text-lg font-bold">$${totalMonthlyPrice.toFixed(2)}/month</span>
            </div>
        </div>
    `;

    summaryDiv.innerHTML = serviceList + totalPriceHtml;

    // Set up reminder preference handlers
    const reminderInputs = document.querySelectorAll('input[name="reminderMethod"]');
    reminderInputs.forEach(input => {
        input.addEventListener('change', function() {
            const method = this.value;
            const serviceInfo = JSON.parse(sessionStorage.getItem('serviceInfo')) || {};
            serviceInfo.reminderMethod = method;
            sessionStorage.setItem('serviceInfo', JSON.stringify(serviceInfo));
            
            // Show confirmation of selection
            const confirmationElement = document.createElement('div');
            confirmationElement.className = 'text-sm text-green-600 mt-2';
            confirmationElement.textContent = `You'll receive ${method} reminders before each pickup`;
            
            const existingConfirmation = document.querySelector('.reminder-preferences .text-green-600');
            if (existingConfirmation) {
                existingConfirmation.remove();
            }
            
            document.querySelector('.reminder-preferences').appendChild(confirmationElement);
            
            // Auto-hide confirmation after 3 seconds
            setTimeout(() => {
                confirmationElement.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
                setTimeout(() => confirmationElement.remove(), 1000);
            }, 3000);
        });
    });
    
    // Set initial reminder method from stored data
    const serviceInfo = JSON.parse(sessionStorage.getItem('serviceInfo')) || {};
    const initialMethod = serviceInfo.reminderMethod || 'email';
    const initialMethodInput = document.querySelector(`input[name="reminderMethod"][value="${initialMethod}"]`);
    if (initialMethodInput) {
        initialMethodInput.checked = true;
    }
}

function showError(message = 'An error occurred with your subscription') {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    
    const errorMessage = document.querySelector('#error .error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showLoading(message = 'Loading...') {
    const loadingElement = document.getElementById('loading');
    const loadingMessage = loadingElement.querySelector('.loading-message');
    
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
    
    loadingElement.classList.remove('hidden');
    document.getElementById('success').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}
