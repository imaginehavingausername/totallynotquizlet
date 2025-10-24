document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
        currentDeck: [],
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'create', 'empty'
        currentLearnCard: null,
        progressData: new Map(), // Stores progress keyed by 'term|definition'
        localStorageKey: 'flashcardAppProgress',
        toastTimeout: null // FIXED: Added to manage the toast timer
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
     * Loads progress, loads deck from URL or default, and renders the initial view.
     */
    function init() {
        loadProgressFromLocalStorage();
        loadDeckFromURL();
        addEventListeners();
        
        if (app.currentDeck.length === 0) {
            setMode('empty');
        } else {
            setMode('flashcards');
        }
    }

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
     * Progress is stored in a simple object keyed by 'term|definition'.
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
     * Loads a deck from the URL hash. If no hash, loads a default deck.
     * Merges loaded progress after deck is loaded.
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
                rawDeck = getDefaultDeck();
                window.location.hash = ''; // Clear invalid hash
            }
        } else {
            rawDeck = getDefaultDeck();
        }

        // Process raw deck: add IDs, default progress, and merge stored progress
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

            // Merge stored progress if found
            return { ...defaultState, ...storedProgress };
        });

        app.currentCardIndex = 0;
    }

    /**
     * Returns a default sample deck.
     */
    function getDefaultDeck() {
        return [
            { term: "Hola", definition: "Hello" },
            { term: "Adiós", definition: "Goodbye" },
            { term: "Por favor", definition: "Please" },
            { term: "Gracias", definition: "Thank you" },
            { term: "Lo siento", definition: "Sorry" }
        ];
    }

    /**
     * Sets the application's current mode and updates the UI.
     * @param {string} mode - The mode to switch to ('flashcards', 'learn', 'create', 'empty').
     */
    function setMode(mode) {
        if (app.currentDeck.length === 0 && mode !== 'create') {
            mode = 'empty';
        } else if (app.currentDeck.length < 4 && mode === 'learn') {
            // Disable learn mode if not enough cards
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnModeDisabled.classList.remove('hidden');
        } else if (mode === 'learn') {
            // Enable learn mode
            dom.learnModeQuiz.classList.remove('hidden');
            dom.learnModeDisabled.classList.add('hidden');
            startLearnMode();
        }

        app.currentMode = mode;
        dom.body.dataset.mode = mode;

        // Update active nav button
        dom.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update views based on mode
        if (mode === 'flashcards') {
            renderFlashcard();
        }
    }

    /**
     * Attaches all primary event listeners.
     */
    function addEventListeners() {
        // Mode navigation
        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => setMode(button.dataset.mode));
        });

        // Flashcard controls
        dom.flashcardContainer.addEventListener('click', () => {
            dom.flashcardContainer.classList.toggle('is-flipped');
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
     * Renders the current flashcard.
     */
    function renderFlashcard() {
        if (app.currentDeck.length === 0) return;

        const card = app.currentDeck[app.currentCardIndex];
        dom.flashcardFront.textContent = card.term;
        dom.flashcardBack.textContent = card.definition;
        dom.cardCounter.textContent = `${app.currentCardIndex + 1} / ${app.currentDeck.length}`;
        dom.flashcardContainer.classList.remove('is-flipped');
    }

    /**
     * Navigates to the previous card.
     */
    function showPrevCard() {
        if (app.currentDeck.length === 0) return;
        app.currentCardIndex = (app.currentCardIndex - 1 + app.currentDeck.length) % app.currentDeck.length;
        renderFlashcard();
    }

    /**
     * Navigates to the next card.
     */
    function showNextCard() {
        if (app.currentDeck.length === 0) return;
        app.currentCardIndex = (app.currentCardIndex + 1) % app.currentDeck.length;
        renderFlashcard();
    }

    // --- LEARN MODE ---

    /**
     * Resets and starts the learn mode.
     */
    function startLearnMode() {
        if (app.currentDeck.length < 4) return;
        dom.learnFeedback.classList.add('hidden');
        renderLearnQuestion();
    }

    /**
     * Selects the next card for learning and renders the quiz.
     */
    function renderLearnQuestion() {
        const card = getNextLearnCard();
        if (!card) {
            // This should ideally not happen if deck has cards
            dom.learnTerm.textContent = "No cards available for learning.";
            dom.learnOptions.innerHTML = '';
            return;
        }

        app.currentLearnCard = card;
        const options = generateQuizOptions(card);

        dom.learnTerm.textContent = card.term;
        dom.learnOptions.innerHTML = ''; // Clear old options
        
        // FIXED: Reset feedback state completely
        dom.learnFeedback.classList.add('hidden');
        dom.learnFeedback.classList.remove('correct', 'incorrect');

        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'learn-option p-4 bg-white rounded-lg border border-gray-200 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors duration-150';
            button.textContent = option;
            button.dataset.answer = option;
            button.addEventListener('click', handleLearnAnswer);
            dom.learnOptions.appendChild(button);
        });
    }

    /**
     * Selects the next card based on SRS logic.
     * 1. Prioritizes due cards (nextReview <= now), sorted by score (lowest first).
     * 2. If no cards are due, picks from all cards, sorted by score (lowest first).
     */
    function getNextLearnCard() {
        const now = Date.now();
        const dueCards = app.currentDeck.filter(card => card.nextReview <= now);

        if (dueCards.length > 0) {
            dueCards.sort((a, b) => a.score - b.score);
            return dueCards[0];
        }

        // If no cards are due, just pick the least-learned card from the entire deck
        const allCardsSorted = [...app.currentDeck].sort((a, b) => a.score - b.score);
        return allCardsSorted[0];
    }

    /**
     * Generates 4 multiple-choice options (1 correct, 3 distractors).
     * @param {object} correctCard - The card object for the correct answer.
     */
    function generateQuizOptions(correctCard) {
        const options = new Set();
        options.add(correctCard.definition);

        const distractorPool = app.currentDeck.filter(card => card.id !== correctCard.id);
        
        // Shuffle the distractor pool
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
        
        // Convert Set to array and shuffle one more time
        const shuffledOptions = Array.from(options);
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }

        return shuffledOptions;
    }

    /**
     * Handles the user's answer in learn mode.
     * @param {Event} event - The click event from the
     */
    function handleLearnAnswer(event) {
        const selectedButton = event.currentTarget;
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = app.currentLearnCard.definition;
        const now = Date.now();

        // Disable all buttons
        dom.learnOptions.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            // Show correct/incorrect styling
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn === selectedButton) {
                btn.classList.add('incorrect');
            }
        });

        if (selectedAnswer === correctAnswer) {
            // Correct Answer
            app.currentLearnCard.score = Math.min(app.currentLearnCard.score + 1, 5);
            app.currentLearnCard.nextReview = now + SRS_INTERVALS[app.currentLearnCard.score];
            
            dom.learnFeedback.textContent = "Correct!";
            // FIXED: Use classList instead of className
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
        } else {
            // Incorrect Answer
            app.currentLearnCard.score = 0;
            app.currentLearnCard.nextReview = now + INCORRECT_INTERVAL;
            
            dom.learnFeedback.textContent = "Incorrect. The correct answer is: " + correctAnswer;
            // FIXED: Use classList instead of className
            dom.learnFeedback.classList.add('incorrect');
            dom.learnFeedback.classList.remove('correct');
        }
        
        app.currentLearnCard.lastReviewed = now;
        dom.learnFeedback.classList.remove('hidden');

        saveProgressToLocalStorage();

        // Move to the next question after a delay
        setTimeout(renderLearnQuestion, 2000);
    }

    // --- CREATE DECK ---

    /**
     * Parses the textarea input, creates a new deck, and reloads the page with the new hash.
     */
    function parseAndLoadDeck() {
        const input = dom.deckInputArea.value.trim();
        if (!input) {
            alert("Input area is empty.");
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
            // Create a base64 hash and reload the page to trigger the full load/merge logic
            const jsonString = JSON.stringify(newDeck);
            const base64String = btoa(jsonString);
            window.location.hash = base64String;
            location.reload(); // Easiest way to force re-initialization
        } catch (error) {
            console.error("Error creating deck hash:", error);
            alert("An error occurred while trying to load the new deck.");
        }
    }

    // --- SHARE DECK ---

    /**
     * Generates a shareable URL and copies it to the clipboard.
     */
    function shareDeck() {
        if (app.currentDeck.length === 0) {
            showToast("Cannot share an empty deck!");
            return;
        }

        try {
            // Create a "clean" deck with only terms and definitions
            const baseDeck = app.currentDeck.map(({ term, definition }) => ({ term, definition }));
            const jsonString = JSON.stringify(baseDeck);
            const base64String = btoa(jsonString);
            const url = `${window.location.origin}${window.location.pathname}#${base64String}`;

            // Copy to clipboard
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

    /**
     * Fallback for copying text to clipboard (for older browsers or insecure contexts).
     */
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Avoid scrolling to bottom
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

    /**
     * Displays a toast notification.
     * @param {string} message - The message to display.
     */
    function showToast(message) {
        // FIXED: Clear any existing timer
        if (app.toastTimeout) {
            clearTimeout(app.toastTimeout);
        }

        dom.toastNotification.textContent = message;
        dom.toastNotification.classList.add('show');
        
        // FIXED: Store the new timer
        app.toastTimeout = setTimeout(() => {
            dom.toastNotification.classList.remove('show');
            app.toastTimeout = null; // Clear the timer ID
        }, 3000);
    }

    // --- START THE APP ---
    init();

});

