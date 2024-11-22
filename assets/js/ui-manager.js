// Check if UIManager already exists
if (typeof window.UIManager === 'undefined') {
    class UIManager {
        constructor() {
            this.formContent = document.querySelector('.rl_contact6_content');
            this.originalHTML = this.formContent?.innerHTML;
        }

        showValidatedAddress(addressToValidate, result) {
            if (!this.formContent) return;

            this.formContent.innerHTML = `
                <div class="address-display" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <p class="rl-text-style-small">${addressToValidate}</p>
                    <button onclick="restoreFormState('${addressToValidate}')" class="address-edit-btn" style="background: none; border: none; cursor: pointer; padding: 5px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
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
        }

        restoreForm(previousAddress) {
            if (!this.formContent || !this.originalHTML) return;
            this.formContent.innerHTML = this.originalHTML;
            
            const form = document.getElementById('wf-form-Address-form');
            if (form) {
                const addressInput = form.querySelector('#address-input');
                if (addressInput) {
                    addressInput.value = previousAddress;
                }
                return form;
            }
        }
    }

    window.uiManager = new UIManager();
} 