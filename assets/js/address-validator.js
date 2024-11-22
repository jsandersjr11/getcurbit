// Check if AddressValidator already exists
if (typeof window.AddressValidator === 'undefined') {
    class AddressValidator {
        constructor() {
            this.validZipCodes = ['84005', '84042'];
            this.initialized = true;
        }

        validateAddress(address) {
            try {
                const zipCodeMatch = address.match(/\b\d{5}\b/);
                const zipCode = zipCodeMatch ? zipCodeMatch[0] : null;
                
                if (!zipCode) {
                    return {
                        error: true,
                        message: 'Invalid ZIP code format',
                        zipCode: null
                    };
                }
                
                return {
                    isValid: this.validZipCodes.includes(zipCode),
                    message: this.validZipCodes.includes(zipCode) 
                        ? 'Great news! We service your area.'
                        : 'Sorry, we don\'t service your area yet.',
                    zipCode: zipCode
                };
            } catch (error) {
                console.error('Error in validateAddress:', error);
                return {
                    error: true,
                    message: 'Error validating address',
                    zipCode: null
                };
            }
        }
    }

    window.AddressValidator = AddressValidator;
}

document.addEventListener('DOMContentLoaded', async () => {
    const validator = new AddressValidator();
    const uiManager = window.uiManager;

    // Function to initialize Google Places Autocomplete
    const initializeAutocomplete = (inputElement) => {
        if (!window.google?.maps?.places) {
            console.warn('Google Maps not loaded yet');
            return null;
        }
        return new google.maps.places.Autocomplete(inputElement, {
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address'],
        });
    };

    // Add form submit handler
    const handleFormSubmit = async (e) => {
        e.preventDefault(); // Prevent form from submitting normally
        
        const form = e.target;
        const submitButton = form.querySelector('.rl-button-5.w-button');
        const addressInput = form.querySelector('#address-input');

        if (!submitButton || !addressInput) return;

        submitButton.value = submitButton.getAttribute('data-wait') || 'Please wait...';
        submitButton.disabled = true;

        try {
            const addressToValidate = addressInput.value;
            if (!addressToValidate) {
                throw new Error('Please enter an address');
            }

            const result = validator.validateAddress(addressToValidate);
            if (!result.error) {
                uiManager.showValidatedAddress(addressToValidate, result);
                // Dispatch an event that the validation was successful
                document.dispatchEvent(new CustomEvent('addressValidated'));
            }
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.value = 'Check availability';
        }
    };

    // Setup form
    const form = document.getElementById('wf-form-Address-form');
    if (form) {
        const addressInput = form.querySelector('#address-input');
        if (addressInput) {
            initializeAutocomplete(addressInput);
        }
        form.addEventListener('submit', handleFormSubmit);
    }

    // Make restore function available globally
    window.restoreFormState = function(previousAddress) {
        const newForm = uiManager.restoreForm(previousAddress);
        if (newForm) {
            const addressInput = newForm.querySelector('#address-input');
            if (addressInput) {
                initializeAutocomplete(addressInput);
            }
            newForm.addEventListener('submit', handleFormSubmit);
        }
    };
});