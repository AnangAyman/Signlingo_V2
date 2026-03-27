document.addEventListener('DOMContentLoaded', () => {
    const packageCards = document.querySelectorAll('.package-card');
    const pricingInfo = document.getElementById('pricingInfo');
    const selectedPlanInput = document.getElementById('selectedPlan'); // Get the hidden input

    packageCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove 'selected' class and check icon from all cards
            packageCards.forEach(c => {
                c.classList.remove('selected');
                const checkIcon = c.querySelector('.check-icon');
                if (checkIcon) {
                    checkIcon.remove();
                }
            });

            // Add 'selected' class to the clicked card
            this.classList.add('selected');

            // Create and add a new check icon to the clicked card
            const checkIcon = document.createElement('div');
            checkIcon.className = 'check-icon';
            checkIcon.innerHTML = '<i class="fas fa-check"></i>';
            this.querySelector('.package-content').appendChild(checkIcon);

            // Get plan details from data attributes
            const plan = this.dataset.plan;
            const monthlyPrice = this.dataset.price.replace('RP ', '').replace(' / MO', '');
            const annualPrice = this.dataset.annual;

            // **This is the new line to update the form value**
            selectedPlanInput.value = plan;

            // Update the pricing information text at the bottom
            if (plan === 'monthly') {
                pricingInfo.innerHTML = `7 day free trial, then Rp ${annualPrice} per month plus applicable taxes`;
            } else if (plan === 'family') {
                // Note: You might want to update the hardcoded "1.859.000,00" to use the data-annual attribute for consistency
                pricingInfo.innerHTML = `7 day free trial, then Rp 1,800,000 per year<br>(Rp ${monthlyPrice}/month, billed annually) plus applicable taxes`;
            } else { // This handles the 'yearly' plan
                pricingInfo.innerHTML = `7 day free trial, then Rp ${annualPrice} per year<br>(Rp ${monthlyPrice}/month, billed annually) plus applicable taxes`;
            }
        });
    });
});