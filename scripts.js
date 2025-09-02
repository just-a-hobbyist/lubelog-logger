// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');
const refreshButton = document.getElementById('refresh-button'); // Get the refresh button

/**
 * Creates the HTML for a single vehicle card.
 * @param {object} vehicle - The vehicle data object from the API.
 * @returns {string} - The HTML string for the vehicle card.
 */
function createVehicleCard(vehicle) {
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const licensePlate = vehicle.licensePlate || 'No Plate';

    return `
        <li class="vehicle-card" data-vehicle-id="${vehicle.id}">
            <h2>${vehicleName}</h2>
            <p>${licensePlate}</p>
        </li>
    `;
}

/**
 * Renders the list of vehicles into the DOM.
 * @param {Array<object>} vehicles - An array of vehicle data objects.
 */
function renderVehicles(vehicles) {
    if (!vehicles || vehicles.length === 0) {
        vehicleList.innerHTML = '<p>No vehicles found.</p>';
        return;
    }

    // Use map and join for better performance than appending in a loop
    const vehicleCardsHTML = vehicles.map(createVehicleCard).join('');
    vehicleList.innerHTML = vehicleCardsHTML;
}

/**
 * Fetches the list of vehicles from the LubeLogger API.
 * @param {object} credentials - The user's credentials object.
 * @param {string} credentials.domain - The server address (e.g., http://127.0.0.1:5000).
 * @param {string} credentials.username - The user's username.
 * @param {string} credentials.password - The user's password.
 */
async function fetchVehicles(credentials) {
    console.log("Attempting to fetch vehicles from:", credentials.domain);

    const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);
    const headers = {
        'Authorization': `Basic ${encodedCredentials}`
    };

    try {
        const response = await fetch(`${credentials.domain}/api/vehicles`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const vehicles = await response.json();
        console.log("Successfully fetched vehicles:", vehicles);
        
        // Save the fresh data to localStorage
        localStorage.setItem("vehicles", JSON.stringify(vehicles));
        
        // Render the new data
        renderVehicles(vehicles);

    } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        alert(`Error fetching vehicles: ${error.message}. Please check credentials and server address.`);
        localStorage.removeItem('lubeLoggerCreds');
        loginModal.classList.remove('hidden');
    }
}


// --- Core App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const savedCreds = localStorage.getItem('lubeLoggerCreds');

    if (!savedCreds) {
        loginModal.classList.remove('hidden');
    } else {
        const creds = JSON.parse(savedCreds);
        const vehiclesJSON = localStorage.getItem('vehicles');

        if (!vehiclesJSON) {
            console.log("No cached vehicles found, fetching...");
            fetchVehicles(creds);
        } else {
            try {
                console.log("Cached vehicles found, rendering...");
                renderVehicles(JSON.parse(vehiclesJSON));
            } catch (e) {
                console.error("Failed to parse cached vehicle data. Refetching.", e);
                fetchVehicles(creds);
            }
        }
    }
});

// --- Event Listeners ---
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); 
    
    let domain = event.target.domain.value.trim();
    const username = event.target.username.value;
    const password = event.target.password.value;

    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = 'http://' + domain;
    }

    if (domain && username && password) {
        const credentials = { domain, username, password };
        localStorage.setItem('lubeLoggerCreds', JSON.stringify(credentials));
        console.log("Credentials and server address saved.");
        loginModal.classList.add('hidden');
        fetchVehicles(credentials);
    }
});

// --- NEW --- Add event listener for the refresh button
refreshButton.addEventListener('click', () => {
    console.log("Manual refresh triggered.");
    const savedCreds = localStorage.getItem('lubeLoggerCreds');
    if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        fetchVehicles(creds);
    }
    // // Remove focus from the button to un-highlight it
    // refreshButton.blur();
    document.getElementById('app').focus();
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

