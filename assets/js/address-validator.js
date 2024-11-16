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
            if (result.isValid) {
                // Clear form contents except close button
                const formContent = form.parentElement;
                
                // Create a container div
                const pricingContainer = document.createElement('div');
                pricingContainer.id = 'pricing-table-container';
                
                // Add the pricing table and close button
                pricingContainer.innerHTML = `
                    <stripe-pricing-table 
                        pricing-table-id="prctbl_1QK5goGwVRYqqGA7sG66CR6h"
                        publishable-key="pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa"
                        client-reference-id="${result.zipCode}">
                    </stripe-pricing-table>
                    <a data-w-id="b378606d-c709-8381-00a3-32a2acf8a46c" class="rl_navbar1_button-secondary w-button">Close</a>
                `;
                
                // Clear existing content and append new container
                formContent.innerHTML = '';
                formContent.appendChild(pricingContainer);
                
                // Ensure the pricing table is properly initialized
                setTimeout(() => {
                    const pricingTable = document.querySelector('stripe-pricing-table');
                    if (pricingTable && !pricingTable.hasAttribute('loaded')) {
                        pricingTable.setAttribute('loaded', 'true');
                        // Force a re-render if needed
                        pricingTable.style.display = 'none';
                        setTimeout(() => pricingTable.style.display = 'block', 100);
                    }
                }, 500);
            } else {
                window.location.href = '/waitlist.html';
            }
        }
    });
});