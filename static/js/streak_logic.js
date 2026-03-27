/**
 * Streak Logic for Dashboard
 * Handles streak saver functionality and visual enhancements
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeStreakCard();
    animateStreakDays();
    handleStreakSaver();
});

/**
 * Initialize the streak card with dynamic features
 */
function initializeStreakCard() {
    const streakDays = document.querySelectorAll('.streak-day');
    const today = new Date().toISOString().split('T')[0];
    
    streakDays.forEach(day => {
        const dayDate = day.getAttribute('data-date');
        
        // Mark today
        if (dayDate === today) {
            day.classList.add('today');
        }
        
        // Add hover tooltips
        addStreakTooltip(day);
    });
}

/**
 * Animate streak days on page load
 */
function animateStreakDays() {
    const streakDays = document.querySelectorAll('.streak-day');
    
    streakDays.forEach((day, index) => {
        setTimeout(() => {
            day.style.opacity = '0';
            day.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                day.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                day.style.opacity = '1';
                day.style.transform = 'scale(1)';
            }, 50);
        }, index * 50);
    });
}

/**
 * Add tooltip to streak day
 */
function addStreakTooltip(dayElement) {
    const date = dayElement.getAttribute('data-date');
    const isActive = dayElement.classList.contains('active');
    const isStreakSaver = dayElement.classList.contains('streak-saver');
    
    let tooltipText = '';
    if (isStreakSaver) {
        tooltipText = 'Streak Saver Used';
    } else if (isActive) {
        tooltipText = 'Lesson Completed';
    } else {
        tooltipText = 'No Activity';
    }
    
    dayElement.title = `${date}\n${tooltipText}`;
}

/**
 * Handle streak saver functionality
 * This checks if user has streak savers available and applies them
 */
function handleStreakSaver() {
    // Check if user has streak savers (this would come from backend)
    const hasStreakSaver = checkStreakSaverAvailability();
    
    if (hasStreakSaver) {
        applyStreakSaverIfNeeded();
    }
}

/**
 * Check if user has streak saver available
 * In production, this would be an API call to check user's inventory
 */
function checkStreakSaverAvailability() {
    // Placeholder: Check localStorage or make API call
    // For now, return false (can be enabled with premium)
    return localStorage.getItem('streakSaverAvailable') === 'true';
}

/**
 * Apply streak saver to break in streak
 */
function applyStreakSaverIfNeeded() {
    const streakDays = document.querySelectorAll('.streak-day');
    let foundBreak = false;
    let savedDay = null;
    
    // Find first inactive day that breaks the streak
    for (let i = streakDays.length - 1; i >= 0; i--) {
        const day = streakDays[i];
        const isActive = day.classList.contains('active');
        
        if (!isActive && !foundBreak) {
            // Check if day after this was active (indicating a break)
            if (i < streakDays.length - 1) {
                const nextDay = streakDays[i + 1];
                if (nextDay.classList.contains('active')) {
                    foundBreak = true;
                    savedDay = day;
                    break;
                }
            }
        }
    }
    
    // Apply streak saver to the break day
    if (savedDay) {
        savedDay.classList.add('streak-saver');
        savedDay.classList.remove('active');
        
        // Update tooltip
        addStreakTooltip(savedDay);
        
        // Mark streak saver as used
        localStorage.setItem('streakSaverAvailable', 'false');
        
        // Show notification
        showStreakSaverNotification();
    }
}

/**
 * Show notification when streak saver is used
 */
function showStreakSaverNotification() {
    const notification = document.createElement('div');
    notification.className = 'streak-saver-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-shield-alt"></i>
            <span>Streak Saver Used! Your streak is protected.</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

/**
 * Calculate and update streak number with animation
 */
function updateStreakCount(newCount) {
    const streakNumber = document.querySelector('.streak-number');
    const currentCount = parseInt(streakNumber.textContent) || 0;
    
    if (newCount !== currentCount) {
        animateNumber(streakNumber, currentCount, newCount, 1000);
    }
}

/**
 * Animate number change
 */
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

/**
 * Add celebration effect when streak milestone reached
 */
function celebrateStreak(milestone) {
    const streakCard = document.querySelector('.streak-card');
    
    // Add celebration class
    streakCard.classList.add('celebrating');
    
    // Create confetti effect
    createConfetti(streakCard);
    
    // Remove celebration class after animation
    setTimeout(() => {
        streakCard.classList.remove('celebrating');
    }, 2000);
}

/**
 * Create confetti effect
 */
function createConfetti(container) {
    const colors = ['#7CB342', '#FFD700', '#00BCD4', '#FF6B35'];
    const confettiCount = 30;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        
        container.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 2000);
    }
}

// CSS for notifications (add to your CSS file)
const style = document.createElement('style');
style.textContent = `
    .streak-saver-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(255, 215, 0, 0.4);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .streak-saver-notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
    }
    
    .notification-content i {
        font-size: 20px;
    }
    
    .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        animation: confettiFall 2s ease-out forwards;
        pointer-events: none;
    }
    
    @keyframes confettiFall {
        from {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
        }
        to {
            transform: translateY(300px) rotate(720deg);
            opacity: 0;
        }
    }
    
    .streak-card.celebrating {
        animation: cardCelebrate 0.6s ease;
    }
    
    @keyframes cardCelebrate {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.02) rotate(-1deg); }
        75% { transform: scale(1.02) rotate(1deg); }
    }
`;
document.head.appendChild(style);