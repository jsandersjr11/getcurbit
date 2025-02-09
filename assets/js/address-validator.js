class AddressValidator {
    constructor() {
        // Initialize Radar with your publishable API key
        this.RADAR_API_KEY = 'prj_live_pk_1a18f69016c9f260317865b80bb5aaf3aa511b47';
        this.SEARCH_RADIUS = 10000; // Search radius in meters
    }

    // Geocode address and check if it's within service area using Radar
    async isAddressInServiceArea(address) {
        try {
            // First, geocode the address using Radar's API
            const geocodeResponse = await fetch(`https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(address)}`, {
                headers: {
                    'Authorization': this.RADAR_API_KEY
                }
            });
            
            const geocodeData = await geocodeResponse.json();
            if (!geocodeData.addresses || geocodeData.addresses.length === 0) {
                throw new Error('Address not found');
            }

            const location = geocodeData.addresses[0];
            
            // Now search for geofences at this location
            const searchResponse = await fetch(`https://api.radar.io/v1/search/geofences?near=${location.latitude},${location.longitude}&radius=${this.SEARCH_RADIUS}`, {
                headers: {
                    'Authorization': this.RADAR_API_KEY
                }
            });

            const searchData = await searchResponse.json();
            
            // If any geofences are found, the address is in the service area
            if (searchData.geofences && searchData.geofences.length > 0) {
                return {
                    isValid: true,
                    geofences: searchData.geofences
                };
            }
            
            return {
                isValid: false,
                message: 'Sorry, we don\'t service your area yet.'
            };
        } catch (error) {
            console.error('Error checking service area:', error);
            throw error;
        }
    }

    // Validate full address and handle redirect
    async validateAddress(addressString) {
        try {
            // Basic validation
            if (!addressString || addressString.trim().length < 5) {
                throw new Error('Please enter a valid address');
            }

            // Check if address is in service area using Radar
            const serviceAreaCheck = await this.isAddressInServiceArea(addressString);
            
            if (serviceAreaCheck.isValid && serviceAreaCheck.geofences && serviceAreaCheck.geofences.length > 0) {
                const metadata = serviceAreaCheck.geofences[0].metadata;
                return {
                    isValid: true,
                    message: 'Great news! We service your area.',
                    address: addressString,
                    geofences: serviceAreaCheck.geofences
                };
            }
            
            return {
                isValid: false,
                message: serviceAreaCheck.message || 'Sorry, we don\'t service your area yet.',
                address: addressString
            };
        } catch (error) {
            return {
                isValid: false,
                message: error.message,
                error: true
            };
        }
    }
}

// Initialize validator and set up form handling
// Helper function to display form error
function displayFormError(form, message) {
    const formError = form.querySelector('.w-form-fail');
    const formSuccess = form.querySelector('.w-form-done');
    
    // Hide success message if visible
    if (formSuccess) formSuccess.style.display = 'none';
    
    // Show error message
    if (formError) {
        formError.style.display = 'block';
        const errorDiv = formError.querySelector('div');
        if (errorDiv) {
            errorDiv.textContent = message;
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const validator = new AddressValidator();
    const form = document.getElementById('wf-form-Address-form');
    const addressInput = document.getElementById('address-input');
    const submitButton = form.querySelector('input[type="submit"]');

    // Add clear button to address input
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '×';
    clearButton.className = 'address-input-clear';
    clearButton.type = 'button'; // Prevent form submission
    clearButton.style.display = 'none';
    addressInput.parentElement.style.position = 'relative';
    addressInput.parentElement.appendChild(clearButton);

    // Show/hide clear button based on input content
    addressInput.addEventListener('input', () => {
        clearButton.style.display = addressInput.value ? 'block' : 'none';
    });

    // Clear input when button is clicked
    clearButton.addEventListener('click', () => {
        addressInput.value = '';
        clearButton.style.display = 'none';
        addressInput.focus();
    });

    // Ensure the form exists before adding the event listener
    if (!form) {
        console.error('Form not found!');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable submit button and show loading state
        const originalButtonText = submitButton.value;
        submitButton.value = submitButton.getAttribute('data-wait') || 'Please wait...';
        submitButton.disabled = true;

        try {

            const addressToValidate = addressInput?.value;
            
            if (!addressToValidate) {
                throw new Error('Please enter an address');
            }

            const result = await validator.validateAddress(addressToValidate);
            const formError = form.querySelector('.w-form-fail');
            const formSuccess = form.querySelector('.w-form-done');
            
            // First hide both messages
            if (formSuccess) formSuccess.style.display = 'none';
            if (formError) formError.style.display = 'none';
            
            if (!result.isValid) {
                // Show error message
                if (formError) {
                    formError.style.display = 'block';
                    const errorDiv = formError.querySelector('div');
                    if (errorDiv) {
                        errorDiv.textContent = result.message;
                    }
                }
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.value = originalButtonText;
            } else {
                // Show loading spinner
                const formContent = document.querySelector('.rl_contact6_content');
                if (!formContent) {
                    throw new Error('Content container not found');
                }

                // Store the original form HTML before showing loading spinner
                const originalFormHTML = formContent.innerHTML;

                // Create and insert loading spinner
                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'loading-spinner';
                loadingSpinner.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <style>
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                        <p style="margin-top: 10px;">Processing your request...</p>
                    </div>
                `;
                formContent.parentNode.insertBefore(loadingSpinner, formContent.nextSibling);
                
                // Hide the form content
                formContent.style.display = 'none';

                // Add slight delay to show loading state
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Remove loading spinner
                loadingSpinner.remove();

                if (result.isValid) {
                    // Redirect to service details page
                    window.location.href = '/signup/service-details.html';
                    
                    // Extract service info from geofence metadata and store in sessionStorage
                    const metadata = result.geofences[0].metadata;
                    const serviceInfo = {
                        pickupDay: metadata.trash_pickupday,
                        trashFrequency: metadata.trash_frequency,
                        recycleFrequency: metadata.recycle_frequency,
                        recycleDay: metadata.recycle_pickupday,
                        recycleWeek: metadata.recycle_week,
                        compostFrequency: metadata.compost_frequency || 'none',
                        compostDay: metadata.compost_pickupday || 'none',
                        compostWeek: metadata.compost_week || 'none'
                    };
                    sessionStorage.setItem('serviceInfo', JSON.stringify(serviceInfo));
                    
                    // If we're already on the service details page, populate the form
                    if (window.location.pathname.includes('service-details.html')) {
                        const serviceForm = document.getElementById('service-form');
                        if (serviceForm) {
                            document.getElementById('service-day').value = result.serviceInfo.pickupDay;
                            document.getElementById('trash-frequency').value = result.serviceInfo.trashFrequency;
                            document.getElementById('recycling-frequency').value = result.serviceInfo.recycleFrequency;
                        }
                    }
                        // </div>
                        // <stripe-pricing-table 
                        //     pricing-table-id="prctbl_1QNaV0GwVRYqqGA78wH32vEu"
                        //     publishable-key="pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa"
                        //     client-reference-id="${result.zipCode}"
                        //     customer-email=""
                        //     customer-address="${addressToValidate}">
                        // </stripe-pricing-table>
                    // `;

                    // Insert the Stripe container after the form content
                    formContent.parentNode.insertBefore(stripePricingContainer, formContent.nextSibling);

                    // Update edit button click handler
                    const editButton = stripePricingContainer.querySelector('.edit-address-btn');
                    if (editButton) {
                        editButton.addEventListener('click', () => {
                            formContent.style.display = 'block';
                            stripePricingContainer.remove();
                        });
                    }
                } else {
                    // Modified redirect to handle HubSpot form
                    const formData = {
                        address: addressToValidate
                    };
                    localStorage.setItem('addressData', JSON.stringify(formData));
                    window.location.href = '/signup/future-service.html';
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            const formError = form.querySelector('.w-form-fail');
            if (formError) {
                formError.style.display = 'block';
                formError.textContent = error.message || 'An error occurred. Please try again.';
            }
        } finally {
            // Reset submit button state
            submitButton.value = originalButtonText;
            submitButton.disabled = false;
        }
    });
});