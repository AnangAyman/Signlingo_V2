document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Fetch results from backend
        const res = await fetch("/get-summary-results");
        if (!res.ok) throw new Error("Failed to fetch summary data.");

        const data = await res.json();
        const { total_xp, average_accuracy } = data;

        const resultsContainer = document.getElementById("results-container");
        resultsContainer.innerHTML = `
            <div class="result-card">
                <div class="result-icon accuracy-icon">
                    <i class="fa-solid fa-bullseye"></i>
                </div>
                <div class="result-value">${average_accuracy.toFixed(0)}%</div>
                <div class="result-label">Average Accuracy</div>
            </div>
            <div class="result-card">
                <div class="result-icon xp-icon">
                    <i class="fa-solid fa-star"></i>
                </div>
                <div class="result-value">+${total_xp}</div>
                <div class="result-label">Total XP Gained</div>
            </div>
        `;
    } catch (err) {
        console.error("Error loading summary:", err);
        document.getElementById("results-container").innerHTML = `
            <p style="color:#F44336; font-weight:600;">Failed to load results. Please try again.</p>
        `;
    }
});
