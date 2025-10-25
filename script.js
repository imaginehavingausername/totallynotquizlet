document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
// ... existing code ... -->
            settings: {
                shuffle: false,
                termFirst: true
            }
        },
        studyDeck: [], // A (potentially shuffled) copy of cards for studying
        learnSessionCards: [], // Cards for the current learn session
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'create', 'empty'
// ... existing code ... -->
        learnOptions: document.getElementById('learn-options'),
        learnFeedback: document.getElementById('learn-feedback'),
        // NEW: Learn Complete View
        learnCompleteView: document.getElementById('learn-complete-view'),
        learnRestartButton: document.getElementById('learn-restart-button'),
        learnSwitchTypeButton: document.getElementById('learn-switch-type-button'),

        // Other
        toastNotification: document.getElementById('toast-notification'),
// ... existing code ... -->
        dom.aboutButton.addEventListener('click', showAboutModal);
        dom.aboutModalClose.addEventListener('click', hideAboutModal);
        dom.aboutModalBackdrop.addEventListener('click', hideAboutModal);

        // NEW: Settings Modal Listeners
// ... existing code ... -->
        dom.settingToggleShuffle.addEventListener('click', handleShuffleSettingChange);
        dom.settingToggleStartWith.addEventListener('click', handleStartWithSettingChange);
    
        // NEW: Learn Complete Listeners
        dom.learnRestartButton.addEventListener('click', startLearnMode);
        dom.learnSwitchTypeButton.addEventListener('click', () => { 
            showToast("Type mode is coming soon!"); 
        });
    }

    // --- NEW: About Modal Functions ---
// ... existing code ... -->
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length < 4) return;
        dom.learnFeedback.classList.add('hidden');
        dom.learnCompleteView.classList.add('hidden'); // NEW: Hide complete view
        dom.learnModeQuiz.classList.remove('hidden'); // NEW: Show quiz view
        
        app.learnSessionCards = [...app.studyDeck]; // NEW: Create session list
        shuffleArray(app.learnSessionCards); // NEW: Shuffle session list
        
        renderLearnQuestion();
    }

    function renderLearnQuestion() {
        // NEW: Check for completion
        if (app.learnSessionCards.length === 0) {
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            return;
        }

        // NEW: Ensure quiz is visible and complete is hidden (for subsequent questions)
        dom.learnModeQuiz.classList.remove('hidden');
        dom.learnCompleteView.classList.add('hidden');
        
        // MODIFIED: Get card from session list
        const card = app.learnSessionCards[0];
        if (!card) {
            // This case should be handled by the check above, but good to have.
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            return;
        }

        app.currentLearnCard = card;
// ... existing code ... -->
            }
        });

        if (selectedAnswer === correctAnswer) {
            app.learnSessionCards.shift(); // NEW: Remove correct card from session
            app.currentLearnCard.score = Math.min(app.currentLearnCard.score + 1, 5);
            app.currentLearnCard.nextReview = now + SRS_INTERVALS[app.currentLearnCard.score];
// ... existing code ... -->
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
        } else {
            app.learnSessionCards.push(app.learnSessionCards.shift()); // NEW: Move incorrect card to back
            app.currentLearnCard.score = 0;
            app.currentLearnCard.nextReview = now + INCORRECT_INTERVAL;
            // MODIFIED: Show the correct answer in the feedback
// ... existing code ... -->

            
