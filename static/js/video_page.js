document.addEventListener('DOMContentLoaded', function() {
    const markButton = document.getElementById('mark-video-completed-btn');
    const mainElementWithKey = document.querySelector('.video-card');
    const lessonKey = mainElementWithKey ? mainElementWithKey.dataset.lessonKey : null;

    if (markButton && lessonKey) {
        markButton.addEventListener('click', async function() {
            markButton.disabled = true;

            try {
                const response = await fetch('/mark-lesson-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        lesson_key: lessonKey,
                        status: 'completed'
                    })
                });

                if (!response.ok) {
                    markButton.disabled = false;
                    return;
                }

                const result = await response.json();
                if (result.success) {
                    window.location.href = '/gamepage';
                } else {
                    markButton.disabled = false;
                }
            } catch (error) {
                markButton.disabled = false;
            }
        });
    }
});