// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');
const refreshButton = document.getElementById('refresh-button'); // Get the refresh button

// Views
const vehicleListView = document.getElementById('view-vehicle-list');
const addFuelView = document.getElementById('view-add-fuel');
const fuelForm = document.getElementById('add-fuel-form');
const fuelFormTitle = document.getElementById('fuel-form-title');
const backFromFuel = document.getElementById('back-from-fuel');
const backFromOdo = document.getElementById('back-from-odo');



// App State
let vehiclesCache = []; // In-memory cache for vehicle data

/**
 * Manages which view is currently visible.
 * @param {string} viewName - The id of the view to show.
 * @param {object} [data] - Optional data for the view.
 */
function showView(viewId, data) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }

    if (viewId === 'view-add-fuel') {
        const vehicle = vehiclesCache.find(v => v.vehicleData.id === data.vehicleId);
        if (vehicle) {
            fuelFormTitle.textContent = `Add Fuel for ${vehicle.vehicleData.year} ${vehicle.vehicleData.make}`;
            fuelForm.dataset.vehicleId = data.vehicleId;
        }
    }
}

/**
 * Creates the HTML for a single, expandable vehicle card.
 * @param {object} vehicle - The vehicle data object from the API.
 * @returns {string} - The HTML string for the vehicle card.
 */
function createVehicleCard(vehicle) {
    const vehicleName = `${vehicle.vehicleData.year} ${vehicle.vehicleData.make} ${vehicle.vehicleData.model}`;
    const licensePlate = vehicle.vehicleData.licensePlate || 'No Plate';
    // Use optional chaining to safely get the odometer reading.
    const latestOdometer = vehicle.lastReportedOdometer?.toString() || 'N/A';

    return `
        <li class="vehicle-card" data-vehicle-id="${vehicle.vehicleData.id}">
            <div class="card-header">
                <div>
                    <h2>${vehicleName}</h2>
                    <p>${licensePlate}</p>
                </div>
                <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </div>
            <div class="card-details">
                <div class="odometer-info">
                    <span>Last Reported Odometer</span>
                    <strong>${latestOdometer}</strong>
                </div>
                <div class="action-buttons">
                    <button class="action-btn" data-action="view-add-fuel">New Fuel Record</button>
                    <button class="action-btn" data-action="view-add-odometer">New Odometer Record</button>
                </div>
            </div>
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

    const vehicleCardsHTML = vehicles.map(createVehicleCard).join('');
    vehicleList.innerHTML = vehicleCardsHTML;
}

/**
 * Fetches the list of vehicles from the LubeLogger API.
 * @param {object} credentials - The user's credentials object.
 */
async function fetchVehicles(credentials) {
    console.log("Attempting to fetch vehicles from:", credentials.domain);

    const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);
    const headers = {
        'Authorization': `Basic ${encodedCredentials}`
    };

    try {
        const response = await fetch(`${credentials.domain}/api/vehicle/info`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const vehicles = await response.json();
        console.log("Successfully fetched vehicles:", vehicles);
        
        localStorage.setItem("vehicles", JSON.stringify(vehicles));
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
    document.getElementById('fuel-date').valueAsDate = new Date();
    document.getElementById('odo-date').valueAsDate = new Date();
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

refreshButton.addEventListener('click', () => {
    console.log("Manual refresh triggered.");
    const savedCreds = localStorage.getItem('lubeLoggerCreds');
    if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        fetchVehicles(creds);
    }
});

backFromFuel.addEventListener('click', () => {
    showView('view-vehicle-list');
});
backFromOdo.addEventListener('click', () => {
    showView('view-vehicle-list');
});

// Event listener for all interactions within the vehicle list
vehicleList.addEventListener('click', (event) => {
    // Case 1: An action button inside the details was clicked
    const actionButton = event.target.closest('.action-btn');
    if (actionButton) {
        event.stopPropagation(); 
        
        const action = actionButton.dataset.action;
        const card = actionButton.closest('.vehicle-card');
        const vehicleId = card.dataset.vehicleId;

        console.log(`Action '${action}' triggered for vehicle ID: ${vehicleId}`);
        // TODO: Add logic here to navigate to the new page for this action
        showView(action, )
        return; // We've handled the click, so we're done.
    }

    // Case 2: The card header was clicked to expand/collapse
    const clickedHeader = event.target.closest('.card-header');
    if (clickedHeader) {
        const card = clickedHeader.closest('.vehicle-card');
        if (!card) return;

        const isAlreadyExpanded = card.classList.contains('expanded');

        // Close any other card that might be open
        document.querySelectorAll('.vehicle-card.expanded').forEach(openCard => {
            openCard.classList.remove('expanded');
        });

        // If the card we clicked wasn't already open, expand it.
        if (!isAlreadyExpanded) {
            card.classList.add('expanded');
        }
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
