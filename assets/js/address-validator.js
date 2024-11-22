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
                    // Create new container for Stripe pricing
                    const stripePricingContainer = document.createElement('div');
                    stripePricingContainer.id = 'stripe-pricing-container';
                    stripePricingContainer.innerHTML = `
                        <div class="validated-address-wrapper" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                            <div class="rl-heading-style-h6-3 validated-address">${addressToValidate}</div>
                            <button type="button" 
                                    class="edit-address-btn" 
                                    style="background: none; border: none; cursor: pointer; padding: 8px;"
                                    aria-label="Edit address">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                        <stripe-pricing-table 
                            pricing-table-id="prctbl_1QNaV0GwVRYqqGA78wH32vEu"
                            publishable-key="pk_live_51PhSkTGwVRYqqGA7KZ1MyQdPAkVQEjogtTdf7HU1HaD0VC39103UpCX2oKw4TQWQB17QL41ql2DHmprq1CxozbMa00bWPEYCoa"
                            client-reference-id="${result.zipCode}"
                            customer-email=""
                            customer-address="${addressToValidate}">
                        </stripe-pricing-table>
                    `;

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