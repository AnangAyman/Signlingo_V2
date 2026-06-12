document.addEventListener('DOMContentLoaded', function() {
    const markButton = document.getElementById('mark-video-completed-btn');
    const mainElementWithKey = document.querySelector('.video-card');
    const lessonKey = mainElementWithKey ? mainElementWithKey.dataset.lessonKey : null;
    const lessonId = mainElementWithKey ? mainElementWithKey.dataset.lessonId : null;
    const lessonUrl = mainElementWithKey ? mainElementWithKey.dataset.lessonUrl : null;
    const markStatusUrl = mainElementWithKey ? mainElementWithKey.dataset.markStatusUrl : null;
    const nextUrl = mainElementWithKey ? mainElementWithKey.dataset.nextUrl : null;

    if (markButton && lessonKey && markStatusUrl) {
        markButton.addEventListener('click', async function() {
            markButton.disabled = true;

            try {
                const response = await fetch(markStatusUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        lesson_key: lessonKey,
                        lesson_id: lessonId || null,
                        lesson_url: lessonUrl || null,
                        status: 'completed'
                    })
                });

                if (!response.ok) {
                    console.error('Failed to mark lesson status:', response.status);
                    markButton.disabled = false;
                    return;
                }

                const result = await response.json();
                if (result.success) {
                    window.location.href = nextUrl || '/gamepage';
                } else {
                    console.error('Lesson status update failed:', result);
                    markButton.disabled = false;
                }
            } catch (error) {
                console.error('Error marking lesson status:', error);
                markButton.disabled = false;
            }
        });
    }
});
