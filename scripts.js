// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');

/**
 * Fetches the list of vehicles from the LubeLogger API.
 * @param {object} credentials - The user's credentials object.
 * @param {string} credentials.domain - The server address (e.g., http://127.0.0.1:5000).
 * @param {string} credentials.username - The user's username.
 * @param {string} credentials.password - The user's password.
 */
async function fetchVehicles(credentials) {
    console.log("Attempting to fetch vehicles from:", credentials.domain);

    // Base64 encode the username and password for Basic Authentication.
    const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);

    const headers = {
        'Authorization': `${encodedCredentials}`
    };

    try {
        const response = await fetch(`${credentials.domain}/api/vehicles`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            // If the server responds with an error (e.g., 401 Unauthorized), throw an error.
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const vehicles = await response.json();
        console.log("Successfully fetched vehicles:", vehicles);
        
        // We will handle rendering the vehicle cards in a later step.
        // For now, let's clear the placeholder content.
        vehicleList.innerHTML = ''; 
        
        // TODO: Create and append vehicle cards to the `vehicleList` element.

    } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        // You could show an error message to the user here.
        alert(`Error fetching vehicles: ${error.message}. Please check your credentials and server address.`);
        
        // Since the fetch failed, we should show the login modal again.
        localStorage.removeItem('lubeLoggerCreds'); // Clear potentially bad credentials
        loginModal.classList.remove('hidden');
    }
}


// --- Core App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const savedCreds = localStorage.getItem('lubeLoggerCreds');

    if (!savedCreds) {
        loginModal.classList.remove('hidden');
    } else {
        console.log("Credentials found, fetching vehicles.");
        const creds = JSON.parse(savedCreds);
        fetchVehicles(creds); // Fetch data on app load
    }
});

// --- Event Listeners ---
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); 
    
    let domain = event.target.domain.value.trim();
    const username = event.target.username.value;
    const password = event.target.password.value;

    // Ensure the domain is an absolute URL by adding http:// if it's missing.
    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = 'http://' + domain;
    }

    if (domain && username && password) {
        const credentials = { domain, username, password };
        localStorage.setItem('lubeLoggerCreds', JSON.stringify(credentials));
        console.log("Credentials and server address saved.");
        loginModal.classList.add('hidden');
        
        fetchVehicles(credentials); // Fetch data immediately after login
    }
});

// Register the service worker
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

