document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('friendSearchForm');
    const searchInput = document.getElementById('friendSearchInput');
    const resultsContainer = document.getElementById('friendsListContainer');
    const friendsLeaderboardList = document.getElementById('friendsLeaderboardList');

    // This function handles the search when the form is submitted.
    const handleSearch = (event) => {
        event.preventDefault();
        const query = searchInput.value.trim().toLowerCase();
        resultsContainer.innerHTML = `<div class="text-center p-4">Searching...</div>`;

        if (query.length < 2) {
            resultsContainer.innerHTML = `<div class="text-center p-4 text-muted"><p>Please enter at least 2 characters.</p></div>`;
            return;
        }

        // Fetch users from the backend
        fetch(`/search-users?q=${query}`)
            .then(response => response.json())
            .then(users => {
                renderSearchResults(users);
            })
            .catch(error => {
                console.error('Error searching for users:', error);
                resultsContainer.innerHTML = `<div class="text-center p-4 text-danger">An error occurred.</div>`;
            });
    };

    // This function renders the search results in the modal.
    const renderSearchResults = (users) => {
        resultsContainer.innerHTML = '';
        if (users.length === 0) {
            resultsContainer.innerHTML = `<div class="text-center p-4 text-muted">No users found.</div>`;
            return;
        }
        users.forEach(user => {
            const userCardHTML = `
                <div class="player-card">
                    <div class="player-info">
                        <div class="player-avatar">${user.name[0]}</div>
                        <span class="player-name">${user.name}</span>
                    </div>
                    <button class="btn-add-friend" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i>
                    </button>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', userCardHTML);
        });
    };

    // Add friend to the leaderboard
    const addFriendToLeaderboard = (userData) => {
        const newRank = friendsLeaderboardList.children.length + 1;
        const friendRowHTML = `
            <div class="player-card">
                <div class="player-info">
                    <div class="player-rank">${newRank}</div>
                    <div class="player-avatar">${userData.name[0]}</div>
                    <span class="player-name">${userData.name}</span>
                </div>
                <div class="player-points">
                    <span class="points-value">0</span>
                    <span class="points-label">XP</span>
                </div>
            </div>
        `;
        friendsLeaderboardList.insertAdjacentHTML('beforeend', friendRowHTML);
    };

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    // Event listener for adding a friend
    resultsContainer.addEventListener('click', function(event) {
        const button = event.target.closest('.btn-add-friend');
        if (button) {
            const playerCard = button.closest('.player-card');
            const userId = button.dataset.userId;
            const userName = playerCard.querySelector('.player-name').textContent;

            // Send a POST request to add the friend
            fetch(`/add_friend/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // You might need to include a CSRF token here if you have one
                },
            })
            .then(response => {
                if (response.ok) {
                    addFriendToLeaderboard({ id: userId, name: userName });
                    playerCard.classList.add('player-card--removing');
                    setTimeout(() => {
                        playerCard.remove();
                    }, 300);
                } else {
                    // Handle errors (e.g., show an error message)
                    console.error('Failed to add friend');
                }
            })
            .catch(error => {
                console.error('Error adding friend:', error);
            });
        }
    });
});