class AddressValidator {
    constructor() {
        this.validZipCodes = [];
        this.initialized = false;
        this.loadZipCodes();
    }

    // Load ZIP codes from CSV file
    async loadZipCodes() {
        try {
            const response = await fetch('/assets/data/valid-zipcodes.csv');
            const csvText = await response.text();
            this.validZipCodes = csvText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            this.initialized = true;
        } catch (error) {
            console.error('Error loading ZIP codes:', error);
            // Fallback to default ZIP code if CSV fails to load
            this.validZipCodes = ['84005'];
            this.initialized = true;
        }
    }

    // Wait for initialization
    async waitForInit() {
        if (!this.initialized) {
            await new Promise(resolve => {
                const checkInit = () => {
                    if (this.initialized) {
                        resolve();
                    } else {
                        setTimeout(checkInit, 100);
                    }
                };
                checkInit();
            });
        }
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

            return {
                isValid: isValidZip,
                message: isValidZip ? 'Great news! We service your area.' : 'Sorry, we don\'t service your area yet.',
                zipCode
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
document.addEventListener('DOMContentLoaded', async () => {
    const validator = new AddressValidator();
    const form = document.getElementById('wf-form-Address-form');
    const addressInput = document.getElementById('address-input');
    const submitButton = form.querySelector('input[type="submit"]');

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
            // Wait for ZIP codes to load
            await validator.waitForInit();

            // Use the full address from the hidden input or the visible input
            const addressToValidate = addressInput?.value;
            
            if (!addressToValidate) {
                throw new Error('Please enter an address');
            }

            const result = validator.validateAddress(addressToValidate);

            // Handle validation result
            if (result.error) {
                // Show error in form
                const formError = form.querySelector('.w-form-fail');
                if (formError) {
                    formError.style.display = 'block';
                    formError.textContent = result.message;
                }
                
                // Hide success message if visible
                const formSuccess = form.querySelector('.w-form-done');
                if (formSuccess) {
                    formSuccess.style.display = 'none';
                }
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
                            pricingTable.style.display = 'none';
                            setTimeout(() => pricingTable.style.display = 'block', 100);
                        }
                    }, 500);
                } else {
                    window.location.href = '/waitlist.html';
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