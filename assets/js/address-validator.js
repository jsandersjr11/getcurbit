class AddressValidator {
    constructor() {
        this.validZipCodes = [];
        this.initialized = false;
        this.loadZipCodes();
    }

    // Load ZIP codes from CSV file
    async loadZipCodes() {
        try {
            const response = await fetch('./assets/data/valid-zipcodes.csv');
            const csvText = await response.text();
            this.validZipCodes = csvText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            console.log('Loaded ZIP codes:', this.validZipCodes);
            this.initialized = true;
        } catch (error) {
            console.error('Error loading ZIP codes:', error);
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
        // Look for ZIP code pattern that matches US format
        const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
        const zip = zipMatch ? zipMatch[0].substring(0, 5) : null; // Take first 5 digits only
        console.log('Input address:', address);
        console.log('Extracted ZIP code:', zip);
        return zip;
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
            console.log('Validating ZIP code:', zipCode);
            console.log('Valid ZIP codes array:', this.validZipCodes);
            console.log('Is ZIP code included?', this.validZipCodes.includes(zipCode));

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
            await validator.waitForInit();
            const addressToValidate = addressInput?.value;
            
            if (!addressToValidate) {
                throw new Error('Please enter an address');
            }

            const result = validator.validateAddress(addressToValidate);

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
                const formContent = document.querySelector('.rl_contact6_content');
                if (!formContent) {
                    throw new Error('Content container not found');
                }

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
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (result.isValid) {
                    // Load Stripe script dynamically
                    const stripeScript = document.createElement('script');
                    stripeScript.src = 'https://js.stripe.com/v3/pricing-table.js';
                    stripeScript.async = true;
                    document.head.appendChild(stripeScript);

                    // Wait for script to load
                    await new Promise(resolve => stripeScript.onload = resolve);

                    // Update content with pricing table
                    formContent.innerHTML = `
                        <stripe-pricing-table 
                            pricing-table-id="prctbl_1QNaV0GwVRYqqGA78wH32vEu"
                            publishable-key="pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa"
                            client-reference-id="${result.zipCode}"
                            customer-email=""
                            customer-address="${addressToValidate}">
                        </stripe-pricing-table>
                    `;
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