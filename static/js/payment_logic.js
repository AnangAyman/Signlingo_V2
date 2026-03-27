// Show/hide card details based on payment method selection
const paymentRadios = document.querySelectorAll('input[name="payment"]');
const cardDetails = document.getElementById('cardDetails');

paymentRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.id === 'card') {
            cardDetails.classList.add('active');
        } else {
            cardDetails.classList.remove('active');
        }
    });
});

// Format card number input
const cardNumberInput = document.querySelector('input[placeholder="1234 5678 9012 3456"]');
if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formattedValue;
    });
}

// Format expiration date
const expiryInput = document.querySelector('input[placeholder="MM / YY"]');
if (expiryInput) {
    expiryInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/\//g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
        }
        e.target.value = value;
    });
}

// Detect card type and show logo
const cardLogo = document.getElementById('cardLogo');

if (cardNumberInput && cardLogo) {
    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '');

        // Determine card type by prefix
        let cardType = '';
        if (/^4/.test(value)) cardType = 'visa';
        else if (/^5[1-5]/.test(value)) cardType = 'mastercard';
        else if (/^3[47]/.test(value)) cardType = 'amex';
        else if (/^6(?:011|5)/.test(value)) cardType = 'discover';
        else cardType = '';

        // Update logo
        if (cardType) {
            cardLogo.className = `fab fa-cc-${cardType}`;
            cardLogo.style.display = 'block';
            // Optional: color per card type
            if (cardType === 'visa') cardLogo.style.color = '#1A1F71';
            else if (cardType === 'mastercard') cardLogo.style.color = '#EB001B';
            else if (cardType === 'amex') cardLogo.style.color = '#006FCF';
            else cardLogo.style.color = '#555';
        } else {
            cardLogo.style.display = 'none';
        }
    });
}
