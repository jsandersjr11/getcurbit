// Sample list of ZIP codes - replace with your actual list
const validZipCodes = [
    '84005', // Eagle mountain
];

class AddressValidator {
    constructor(zipCodeList) {
        this.validZipCodes = zipCodeList;
    }

    // Extract ZIP code from address string
    extractZipCode(address) {
        // Look for 5 digit number pattern in address
        const zipMatch = address.match(/\b\d{5}\b/);
        return zipMatch ? zipMatch[0] : null;
    }

    // Validate full address and handle redirect
    validateAddress(addressString) {
        try {
            // Basic validation
            if (!addressString || addressString.trim().length < 5) {
                throw new Error('Please enter a valid address');
            }

            // Extract ZIP code
            const zipCode = this.extractZipCode(addressString);
            if (!zipCode) {
                throw new Error('No valid ZIP code found in address');
            }

            // Check if ZIP code is in service area
            const isValidZip = this.validZipCodes.includes(zipCode);

            // Handle redirect based on ZIP code validation
            if (isValidZip) {
                window.open('https://billing.stripe.com/p/login/6oE7vn2MM8uh7hm8ww', '_blank');
                return {
                    isValid: true,
                    message: 'Great news! We service your area.',
                    zipCode
                };
            } else {
                window.location.href = '/waitlist.html';
                return {
                    isValid: false,
                    message: 'Sorry, we don\'t service your area yet.',
                    zipCode
                };
            }
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
document.addEventListener('DOMContentLoaded', () => {
    const validator = new AddressValidator(validZipCodes);
    const form = document.getElementById('wf-form-Address-form');
    const addressInput = document.getElementById('address-2');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const result = validator.validateAddress(addressInput.value);
        
        // Handle validation result
        if (result.error) {
            // Show error in form
            const formError = form.querySelector('.w-form-fail');
            formError.style.display = 'block';
            formError.textContent = result.message;
            
            // Hide success message if visible
            const formSuccess = form.querySelector('.w-form-done');
            formSuccess.style.display = 'none';
        } else {
            // Show success message before redirect
            const formSuccess = form.querySelector('.w-form-done');
            formSuccess.style.display = 'block';
            formSuccess.textContent = result.message;
            
            // Hide error if visible
            const formError = form.querySelector('.w-form-fail');
            formError.style.display = 'none';
            
            // Delay redirect slightly to show message
            setTimeout(() => {
                if (result.isValid) {
                    window.open('https://billing.stripe.com/p/login/6oE7vn2MM8uh7hm8ww', '_blank');
                } else {
                    window.location.href = '/waitlist.html';
                }
            }, 1500);
        }
    });
});