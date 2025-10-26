document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
// ... existing code ... -->
    const INCORRECT_INTERVAL = 60 * 1000; // 1 minute

    // --- CORE LOGIC ---

// ... existing code ... -->
    function loadDeckFromURL() {
        // MODIFIED: rawDeck is now an object
        let rawDeck = getDefaultDeck();
        const hash = window.location.hash.substring(1);
        const defaultSettings = { shuffle: false, termFirst: true };

        if (hash) {
            try {
                // MODIFIED: Use URL-safe atob
                const jsonString = urlSafeAtob(hash);
                const parsedDeck = JSON.parse(jsonString);
                
                // Check for new structure (with settings)
// ... existing code ... -->
    function updateURLHash() {
        if (app.currentDeck.cards.length === 0) return;
        try {
// ... existing code ... -->
                cards: app.currentDeck.cards.map(({ term, definition }) => ({ term, definition })),
                settings: app.currentDeck.settings
            };
            const jsonString = JSON.stringify(baseDeck);
            // MODIFIED: Use URL-safe btoa
            const base64String = urlSafeBtoa(jsonString);
            // Use replaceState to avoid cluttering browser history
            const newUrl = `${window.location.pathname}${window.location.search}#${base64String}`;
// ... existing code ... -->
            }
        };

        try {
            const jsonString = JSON.stringify(newDeck);
            // MODIFIED: Use URL-safe btoa
            const base64String = urlSafeBtoa(jsonString);
            window.location.hash = base64String;
            location.reload(); 
// ... existing code ... -->
                cards: app.currentDeck.cards.map(({ term, definition }) => ({ term, definition })),
                settings: app.currentDeck.settings
            };
            const jsonString = JSON.stringify(baseDeck);
            // MODIFIED: Use URL-safe btoa
            const base64String = urlSafeBtoa(jsonString);
            const url = `${window.location.origin}${window.location.pathname}#${base64String}`;

            if (navigator.clipboard) {
// ... existing code ... -->
            app.timeoutToast = null; 
        }, 3000);
    }

    // --- NEW: UTILITY FUNCTIONS ---
    
// ... existing code ... -->
        }
    }

    // --- NEW: URL-Safe Base64 Handlers ---

    /**
     * Encodes a string into URL-safe base64.
     * @param {string} str The string to encode.
     * @returns {string} The URL-safe base64 string.
     */
    function urlSafeBtoa(str) {
        return btoa(str)
            .replace(/\+/g, '-') // Replace + with -
            .replace(/\//g, '_') // Replace / with _
            .replace(/=+$/, ''); // Remove trailing =
    }

    /**
     * Decodes a URL-safe base64 string.
     * @param {string} str The URL-safe base64 string.
     * @returns {string} The decoded string.
     */
    function urlSafeAtob(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/'); // Convert back to standard chars
        // Add padding
        switch (str.length % 4) {
            case 0: // No padding needed
                break;
            case 2: // Two characters missing
                str += '==';
                break;
            case 3: // One character missing
                str += '=';
                break;
            default:
                // This should not happen, but good to handle
                console.error('Invalid base64 string!');
                return '';
        }
        try {
            return atob(str);
        } catch (e) {
            console.error('atob failed:', e);
            return ''; // Return empty string on failure
        }
    }


    // --- START THE APP ---
    init();
// ... existing code ... -->

