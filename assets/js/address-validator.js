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

    form.addEventListener('submit', async (e) => {
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
            // Show loading spinner
            const formContent = form.parentElement;
            formContent.innerHTML = `
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

            // Add slight delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (result.isValid) {
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