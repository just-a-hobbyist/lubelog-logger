// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');

/**
 * Renders the vehicle data into clickable cards in the UI.
 * @param {Array<object>} vehicles - An array of vehicle objects from the API.
 */
function renderVehicles(vehicles) {
    // Clear any existing content (like the placeholders or a "no vehicles" message)
    vehicleList.innerHTML = '';

    if (!vehicles || vehicles.length === 0) {
        vehicleList.innerHTML = '<p class="no-vehicles-message">No vehicles found.</p>';
        return;
    }

    vehicles.forEach(vehicle => {
        // 1. Create the main link element (the card)
        const cardLink = document.createElement('a');
        cardLink.href = '#'; // Placeholder link for future navigation
        cardLink.className = 'vehicle-card';
        cardLink.dataset.vehicleId = vehicle.id; // Store the vehicle ID on the element for later use

        // 2. Create the container for the text
        const textContainer = document.createElement('div');

        // 3. Create and populate the vehicle name paragraph
        const nameParagraph = document.createElement('p');
        nameParagraph.className = 'vehicle-name';
        nameParagraph.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

        // 4. Create and populate the license plate paragraph
        const plateParagraph = document.createElement('p');
        plateParagraph.className = 'vehicle-plate';
        plateParagraph.textContent = vehicle.licensePlate;

        // 5. Create the chevron icon SVG (this is more robust than innerHTML)
        const chevronIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevronIcon.setAttribute('class', 'chevron-icon');
        chevronIcon.setAttribute('fill', 'none');
        chevronIcon.setAttribute('viewBox', '0 0 24 24');
        chevronIcon.setAttribute('stroke', 'currentColor');
        const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        chevronPath.setAttribute('stroke-linecap', 'round');
        chevronPath.setAttribute('stroke-linejoin', 'round');
        chevronPath.setAttribute('stroke-width', '2');
        chevronPath.setAttribute('d', 'M9 5l7 7-7 7');
        chevronIcon.appendChild(chevronPath);

        // 6. Assemble the card by appending the new elements
        textContainer.appendChild(nameParagraph);
        textContainer.appendChild(plateParagraph);
        cardLink.appendChild(textContainer);
        cardLink.appendChild(chevronIcon);

        // 7. Append the fully assembled card to the vehicle list in the DOM
        vehicleList.appendChild(cardLink);
    });
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

    // Base64 encode the username and password for Basic Authentication.
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
        
        // NEW: Call the render function with the fetched data
        renderVehicles(vehicles);
        localStorage.setItem("vehicles", JSON.stringify(vehicles));

    } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        alert(`Error fetching vehicles: ${error.message}. Please check your credentials and server address.`);
        
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
        console.log("Credentials found.");
        const vehiclesJSON = localStorage.getItem('vehicles');
        if (!vehiclesJSON) {
            fetchVehicles(JSON.parse(savedCreds));
        } else {
            try {
                console.log("Vehicles found, rendering");
                renderVehicles(JSON.parse(vehiclesJSON));
            } catch (e) {
                console.error("Failed to parse cached vehicle data. Refetching.", e);
                fetchVehicles(creds); // Fallback to fetching from network
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

