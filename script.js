document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
        currentDeck: [],
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'create', 'empty'
        currentLearnCard: null,
        progressData: new Map(), // Stores progress keyed by 'term|definition'
        localStorageKey: 'flashcardAppProgress',
        themeKey: 'flashcardAppTheme', // NEW: Key for theme
        toastTimeout: null,
        isAnimating: false // Prevents spam-clicking during animations
    };

    // --- DOM ELEMENTS ---
    const dom = {
        body: document.body,
        navButtons: document.querySelectorAll('.nav-button'),
        shareDeckButton: document.getElementById('share-deck-button'),
        
        // Create View
        createView: document.getElementById('create-view'),
        deckInputArea: document.getElementById('deck-input-area'),
        parseDeckButton: document.getElementById('parse-deck-button'),

        // Flashcard View
        flashcardsView: document.getElementById('flashcards-view'),
        flashcardContainer: document.getElementById('flashcard-container'),
        flashcardFront: document.getElementById('flashcard-front').querySelector('p'),
        flashcardBack: document.getElementById('flashcard-back').querySelector('p'),
        prevCardButton: document.getElementById('prev-card-button'),
        nextCardButton: document.getElementById('next-card-button'),
        cardCounter: document.getElementById('card-counter'),

        // Learn View
        learnView: document.getElementById('learn-view'),
        learnModeDisabled: document.getElementById('learn-mode-disabled'),
        learnModeQuiz: document.getElementById('learn-mode-quiz'),
        learnTerm: document.getElementById('learn-term'),
        learnOptions: document.getElementById('learn-options'),
        learnFeedback: document.getElementById('learn-feedback'),

        // Other
        toastNotification: document.getElementById('toast-notification'),
        emptyDeckView: document.getElementById('empty-deck-view'),

        // NEW: Theme Toggle Elements
        themeToggleButton: document.getElementById('theme-toggle-button'),
        themeIconSun: document.getElementById('theme-icon-sun'),
        themeIconMoon: document.getElementById('theme-icon-moon'),
    };

    // --- CONSTANTS ---
    const SRS_INTERVALS = {
        1: 5 * 60 * 1000,         // 5 minutes
        2: 30 * 60 * 1000,        // 30 minutes
        3: 24 * 60 * 60 * 1000,   // 1 day
        4: 3 * 24 * 60 * 60 * 1000, // 3 days
        5: 7 * 24 * 60 * 60 * 1000  // 7 days
    };
    const INCORRECT_INTERVAL = 60 * 1000; // 1 minute

    // --- CORE LOGIC ---

    /**
     * Initializes the application.
     */
    function init() {
        loadTheme(); // NEW: Load theme first
        loadProgressFromLocalStorage();
        loadDeckFromURL();
        addEventListeners();
        
        // MODIFIED: Default to 'create' if no deck, 'flashcards' if a deck is loaded
        if (app.currentDeck.length === 0) {
            setMode('create');
        } else {
            setMode('flashcards');
        }
    }

    // --- NEW: THEME LOGIC ---

    /**
     * Loads the saved theme from localStorage and applies it.
     * Defaults to 'dark' as requested.
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem(app.themeKey) || 'dark'; // Default to dark
        setTheme(savedTheme);
    }

    /**
     * Toggles the theme between light and dark.
     */
    function toggleTheme() {
        if (dom.body.classList.contains('light-mode')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }

    /**
     * Applies a specific theme and saves it to localStorage.
     * @param {string} theme - 'light' or 'dark'
     */
    function setTheme(theme) {
        if (theme === 'light') {
            dom.body.classList.add('light-mode');
            dom.themeIconSun.classList.add('hidden');
            dom.themeIconMoon.classList.remove('hidden');
        } else {
            dom.body.classList.remove('light-mode');
            dom.themeIconSun.classList.remove('hidden');
            dom.themeIconMoon.classList.add('hidden');
        }
        localStorage.setItem(app.themeKey, theme);
    }

    // --- END THEME LOGIC ---


    /**
     * Loads progress data from localStorage into the app.progressData Map.
     */
    function loadProgressFromLocalStorage() {
        try {
            const storedProgress = localStorage.getItem(app.localStorageKey);
            if (storedProgress) {
                const parsed = JSON.parse(storedProgress);
                app.progressData = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error("Error loading progress from localStorage:", error);
            app.progressData = new Map();
        }
    }

    /**
     * Saves the current deck's progress to localStorage.
     */
    function saveProgressToLocalStorage() {
        try {
            const progressToSave = {};
            for (const card of app.currentDeck) {
                const key = `${card.term}|${card.definition}`;
                progressToSave[key] = {
                    score: card.score,
                    lastReviewed: card.lastReviewed,
                    nextReview: card.nextReview
                };
            }
            localStorage.setItem(app.localStorageKey, JSON.stringify(progressToSave));
        } catch (error) {
            console.error("Error saving progress to localStorage:", error);
        }
    }

    /**
     * Loads a deck from the URL hash.
     */
    function loadDeckFromURL() {
        let rawDeck = [];
        const hash = window.location.hash.substring(1);

        if (hash) {
            try {
                const jsonString = atob(hash);
                rawDeck = JSON.parse(jsonString);
                if (!Array.isArray(rawDeck)) throw new Error("Data is not an array");
            } catch (error) {
                console.error("Error parsing deck from hash:", error);
                rawDeck = getDefaultDeck(); // Will be empty
                window.location.hash = ''; // Clear invalid hash
            }
        } else {
            rawDeck = getDefaultDeck(); // Will be empty
        }

        app.currentDeck = rawDeck.map((card, index) => {
            const key = `${card.term}|${card.definition}`;
            const storedProgress = app.progressData.get(key);
            const defaultState = {
                id: `${Date.now()}-${index}`,
                term: card.term,
                definition: card.definition,
                score: 0,
                lastReviewed: 0,
                nextReview: 0
            };
            return { ...defaultState, ...storedProgress };
        });

        app.currentCardIndex = 0;
    }

    /**
     * Returns a default sample deck.
     */
    function getDefaultDeck() {
        // MODIFIED: Return an empty array. No default deck.
        return [];
    }

    /**
     * Sets the application's current mode and updates the UI.
     * @param {string} mode - The mode to switch to.
     */
    function setMode(mode) {
        // MODIFIED: Store the intended mode for the active button state
        const originalMode = mode;

        // MODIFIED: If deck is empty and user tries to go to 'flashcards' or 'learn', show 'empty' view.
        if (app.currentDeck.length === 0 && (mode === 'flashcards' || mode === 'learn')) {
            mode = 'empty';
        } else if (app.currentDeck.length < 4 && mode === 'learn') {
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnModeDisabled.classList.remove('hidden');
        } else if (mode === 'learn') {
            dom.learnModeQuiz.classList.remove('hidden');
            dom.learnModeDisabled.classList.add('hidden');
            startLearnMode();
        }

        app.currentMode = mode;
        dom.body.dataset.mode = mode;

        dom.navButtons.forEach(btn => {
            // MODIFIED: Check against originalMode to set the correct active button
            btn.classList.toggle('active', btn.dataset.mode === originalMode);
        });

        if (mode === 'flashcards') {
            renderFlashcardContent(); 
            dom.flashcardContainer.classList.remove('is-flipped');
        }
    }

    /**
     * Attaches all primary event listeners.
     */
    function addEventListeners() {
        // NEW: Theme toggle
        dom.themeToggleButton.addEventListener('click', toggleTheme);

        // Mode navigation
        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => setMode(button.dataset.mode));
        });

        // Flashcard controls
        dom.flashcardContainer.addEventListener('click', () => {
            if (!app.isAnimating) { // Don't flip while fading
                dom.flashcardContainer.classList.toggle('is-flipped');
            }
        });
        dom.prevCardButton.addEventListener('click', showPrevCard);
        dom.nextCardButton.addEventListener('click', showNextCard);

        // Create deck controls
        dom.parseDeckButton.addEventListener('click', parseAndLoadDeck);
        
        // Share button
        dom.shareDeckButton.addEventListener('click', shareDeck);
    }

    // --- FLASHCARD MODE ---

    /**
     * Renders the current flashcard's text content.
     */
    function renderFlashcardContent() {
        if (app.currentDeck.length === 0) return;

        const card = app.currentDeck[app.currentCardIndex];
        dom.flashcardFront.textContent = card.term;
        dom.flashcardBack.textContent = card.definition;
        dom.cardCounter.textContent = `${app.currentCardIndex + 1} / ${app.currentDeck.length}`;
    }


    // MODIFIED: Re-written to fix animation bug.
    function showPrevCard() {
        if (app.currentDeck.length === 0 || app.isAnimating) return;
        app.isAnimating = true;

        // 1. Fade out
        dom.flashcardContainer.style.opacity = 0;

        // 2. Wait for fade to finish (200ms from CSS)
        setTimeout(() => {
            // 3. Add class to disable flip animation
            dom.flashcardContainer.classList.add('no-flip-animation');
            
            // 4. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');
            
            // 5. Change content
            app.currentCardIndex = (app.currentCardIndex - 1 + app.currentDeck.length) % app.currentDeck.length;
            renderFlashcardContent(); // Update text
            
            // 6. Force reflow to apply instant changes
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            dom.flashcardContainer.classList.remove('no-flip-animation');
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;

            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // MODIFIED: Re-written to fix animation bug.
    function showNextCard() {
        if (app.currentDeck.length === 0 || app.isAnimating) return;
        app.isAnimating = true;

        // 1. Fade out
        dom.flashcardContainer.style.opacity = 0;

        // 2. Wait for fade to finish (200ms from CSS)
        setTimeout(() => {
            // 3. Add class to disable flip animation
            dom.flashcardContainer.classList.add('no-flip-animation');
            
            // 4. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');

            // 5. Change content
            app.currentCardIndex = (app.currentCardIndex + 1) % app.currentDeck.length;
            renderFlashcardContent(); // Update text

            // 6. Force reflow to apply instant changes
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            dom.flashcardContainer.classList.remove('no-flip-animation');
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;
            
            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // --- LEARN MODE ---

    function startLearnMode() {
        if (app.currentDeck.length < 4) return;
        dom.learnFeedback.classList.add('hidden');
        renderLearnQuestion();
    }

    function renderLearnQuestion() {
        const card = getNextLearnCard();
        if (!card) {
            dom.learnTerm.textContent = "No cards available for learning.";
            dom.learnOptions.innerHTML = '';
            return;
        }

        app.currentLearnCard = card;
        const options = generateQuizOptions(card);

        dom.learnTerm.textContent = card.term;
        dom.learnOptions.innerHTML = ''; 
        
        dom.learnFeedback.classList.add('hidden');
        dom.learnFeedback.classList.remove('correct', 'incorrect');

        options.forEach(option => {
            const button = document.createElement('button');
            // MODIFIED: Added rounded-xl, kept layout classes
            button.className = 'learn-option p-4 rounded-xl border text-left';
            button.textContent = option;
            button.dataset.answer = option;
            button.addEventListener('click', handleLearnAnswer);
            dom.learnOptions.appendChild(button);
        });
    }

    function getNextLearnCard() {
        const now = Date.now();
        const dueCards = app.currentDeck.filter(card => card.nextReview <= now);

        if (dueCards.length > 0) {
            dueCards.sort((a, b) => a.score - b.score);
            return dueCards[0];
        }

        const allCardsSorted = [...app.currentDeck].sort((a, b) => a.score - b.score);
        return allCardsSorted[0];
    }

    function generateQuizOptions(correctCard) {
        const options = new Set();
        options.add(correctCard.definition);

        const distractorPool = app.currentDeck.filter(card => card.id !== correctCard.id);
        
        for (let i = distractorPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [distractorPool[i], distractorPool[j]] = [distractorPool[j], distractorPool[i]];
        }

        for (const card of distractorPool) {
            if (options.size < 4) {
                options.add(card.definition);
            } else {
                break;
            }
        }
        
        const shuffledOptions = Array.from(options);
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }

        return shuffledOptions;
    }

    function handleLearnAnswer(event) {
        const selectedButton = event.currentTarget;
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = app.currentLearnCard.definition;
        const now = Date.now();

        dom.learnOptions.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn === selectedButton) {
                btn.classList.add('incorrect');
            }
        });

        if (selectedAnswer === correctAnswer) {
            app.currentLearnCard.score = Math.min(app.currentLearnCard.score + 1, 5);
            app.currentLearnCard.nextReview = now + SRS_INTERVALS[app.currentLearnCard.score];
            dom.learnFeedback.textContent = "Correct!";
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
        } else {
            app.currentLearnCard.score = 0;
            app.currentLearnCard.nextReview = now + INCORRECT_INTERVAL;
            dom.learnFeedback.textContent = "Incorrect. The correct answer is: " + correctAnswer;
            dom.learnFeedback.classList.add('incorrect');
            dom.learnFeedback.classList.remove('correct');
        }
        
        app.currentLearnCard.lastReviewed = now;
        dom.learnFeedback.classList.remove('hidden');

        saveProgressToLocalStorage();
        setTimeout(renderLearnQuestion, 2000);
    }

    // --- CREATE DECK ---

    function parseAndLoadDeck() {
        const input = dom.deckInputArea.value.trim();
        if (!input) {
            alert("Input area is empty."); // Simple alert is fine for this action
            return;
        }

        const lines = input.split('\n');
        const newDeck = [];
        let errorCount = 0;

        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length === 2) {
                const term = parts[0].trim();
                const definition = parts[1].trim();
                if (term && definition) {
                    newDeck.push({ term, definition });
                } else {
                    errorCount++;
                }
            } else if (line.trim() !== '') {
                errorCount++;
            }
        }

        if (newDeck.length === 0) {
            alert("Could not parse any valid cards. Please check the format.");
            return;
        }

        if (errorCount > 0) {
            alert(`Successfully loaded ${newDeck.length} cards, but ${errorCount} lines were ignored due to formatting errors.`);
        }

        try {
            const jsonString = JSON.stringify(newDeck);
            const base64String = btoa(jsonString);
            window.location.hash = base64String;
            location.reload(); 
        } catch (error) {
            console.error("Error creating deck hash:", error);
            alert("An error occurred while trying to load the new deck.");
        }
    }

    // --- SHARE DECK ---

    function shareDeck() {
        if (app.currentDeck.length === 0) {
            showToast("Cannot share an empty deck!");
            return;
        }

        try {
            const baseDeck = app.currentDeck.map(({ term, definition }) => ({ term, definition }));
            const jsonString = JSON.stringify(baseDeck);
            const base64String = btoa(jsonString);
            const url = `${window.location.origin}${window.location.pathname}#${base64String}`;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast("Share link copied to clipboard!");
                }).catch(err => {
                    console.error("Failed to copy to clipboard:", err);
                    fallbackCopyTextToClipboard(url);
                });
            } else {
                fallbackCopyTextToClipboard(url);
            }

        } catch (error) {
            console.error("Error generating share link:", error);
            showToast("Error generating share link.");
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast("Share link copied to clipboard!");
            } else {
                showToast("Could not copy link.");
            }
        } catch (err) {
            showToast("Could not copy link.");
        }
        document.body.removeChild(textArea);
    }

    function showToast(message) {
        if (app.toastTimeout) {
            clearTimeout(app.toastTimeout);
        }
        dom.toastNotification.textContent = message;
        dom.toastNotification.classList.add('show');
        app.toastTimeout = setTimeout(() => {
            dom.toastNotification.classList.remove('show');
            app.toastTimeout = null; 
        }, 3000);
    }

    // --- START THE APP ---
    init();

});

