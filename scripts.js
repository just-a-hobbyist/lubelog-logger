// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');

// --- Core App Logic ---
// This runs after the HTML document has been fully loaded and parsed.
// The 'defer' attribute in the script tag in index.html ensures this behavior.
document.addEventListener('DOMContentLoaded', () => {
    // Check if user credentials are saved in the browser's local storage
    const savedCreds = localStorage.getItem('lubeLoggerCreds');

    if (!savedCreds) {
        // If no credentials are found, show the login modal by removing the 'hidden' class.
        loginModal.classList.remove('hidden');
    } else {
        // If credentials exist, we can proceed to fetch vehicle data.
        // This part will be built out in the next steps.
        console.log("Credentials found, ready to fetch vehicles.");
        // fetchVehicles(JSON.parse(savedCreds));
    }
});

// --- Event Listeners ---
// Listen for the form submission event
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent the form from causing a page reload
    
    const username = event.target.username.value;
    const password = event.target.password.value;

    if (username && password) {
        // In a real application, you would first make an API call to verify these credentials.
        
        // For now, we will save them to localStorage and hide the modal.
        const credentials = { username, password };
        localStorage.setItem('lubeLoggerCreds', JSON.stringify(credentials));

        console.log("Credentials saved.");

        // Hide the modal by adding the 'hidden' class back.
        loginModal.classList.add('hidden');
        
        // Now you would trigger the initial data fetch with the new credentials
        // fetchVehicles(credentials);
    }
});

// Register the service worker for PWA functionality (enables offline access, etc.)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
