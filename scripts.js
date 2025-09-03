// --- DOM Element Selection ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');
const refreshButton = document.getElementById('refresh-button'); // Get the refresh button
const toast = document.getElementById('toast-notification');
const domainField = document.getElementById('domain');

// Views
const vehicleListView = document.getElementById('view-vehicle-list');
const addFuelView = document.getElementById('view-add-fuel');
const addOdometerView = document.getElementById('view-add-odometer');
const fuelForm = document.getElementById('add-fuel-form');
const odometerForm = document.getElementById('add-odometer-form');
const fuelFormTitle = document.getElementById('fuel-form-title');
const odometerFormTitle = document.getElementById('odometer-form-title');
const backFromFuel = document.getElementById('back-from-fuel');
const backFromOdometer = document.getElementById('back-from-odometer');



// App State
let vehiclesCache = []; // In-memory cache for vehicle data
let toastTimeout; // To manage toast timer

/**
 * Manages which view is currently visible.
 * @param {string} viewId - The id of the view to show.
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
    } else if (viewId === 'view-add-odometer') {
        const vehicle = vehiclesCache.find(v => v.vehicleData.id === data.vehicleId);
        if (vehicle) {
            odometerFormTitle.textContent = `Add Odometer for ${vehicle.vehicleData.year} ${vehicle.vehicleData.make}`;
            odometerForm.dataset.vehicleId = data.vehicleId;
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
        <li class="vehicle-card" data-vehicle-id="${vehicle.vehicleData.id}" data-touch-feedback>
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
                    <button class="action-btn" data-action="view-add-fuel" data-touch-feedback>New Fuel Record</button>
                    <button class="action-btn" data-action="view-add-odometer" data-touch-feedback>New Odometer Record</button>
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
    vehiclesCache = vehicles;
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

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {string} [type='success'] - The type of toast ('success' or 'error').
 */
function showToast(message, type = 'success') {
    // Clear any existing timer to prevent the toast from disappearing early
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toast.textContent = message;

    // Apply the correct style
    toast.className = 'toast'; // Reset classes
    toast.classList.add(type); // Add 'success' or 'error'

    // Make it visible
    toast.classList.add('active');

    // Set a timer to hide it after 3 seconds
    toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

/**
 * Submits a new record to the LubeLogger API.
 * @param {number} vehicleId - The ID of the vehicle.
 * @param {object} record - The gas record data.
 * @param {string} type - The type ['gas' or 'odometer'] of record to submit
 */
async function addRecord(vehicleId, record, type) {
    let formType;
    let dateBox;
    let successMsg = " saved successfully!";
    switch (type) {
        case 'gas':
            formType = fuelForm;
            dateBox = document.getElementById('fuel-date');
            successMsg = "Gas" + successMsg;
            break;
        case 'odometer':
            formType = odometerForm;
            dateBox = document.getElementById('odometer-date');
            successMsg = "Odometer" + successMsg;
            break;
        default:
            console.error('Unknown record type');
            return;
    }
    const submitButton = formType.querySelector('.save-btn');
    const originalButtonText = submitButton.textContent;

    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
        const savedCreds = localStorage.getItem('lubeLoggerCreds');
        if (!savedCreds) {
            alert("Credentials not found. Please log in again.");
            return;
        }
        const credentials = JSON.parse(savedCreds);
        const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);

        const formData = new URLSearchParams();
        for (const key in record) {
            formData.append(key, record[key]);
        }

        const response = await fetch(`${credentials.domain}/api/vehicle/${type}records/add?vehicleId=${vehicleId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("Successfully added record:", result);
        showToast(successMsg);
        submitButton.textContent = "Refreshing Home Page";
        await fetchVehicles(credentials);
        showView('view-vehicle-list');
        formType.reset();
        dateBox.valueAsDate = new Date();
    } catch (error) {
        console.error(`Failed to add ${type} record: ${error}`);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        // Re-enable the button and restore original text, regardless of success or failure
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// --- Core App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const savedCreds = localStorage.getItem('lubeLoggerCreds');
    const lastDomain = localStorage.getItem('lastDomain');
    if (lastDomain) domainField.value = lastDomain;
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
    // --- Touch Tolerance & Feedback Handler ---
    // Allows a certain amount of movement on touch and still count as a tap rather than a drag
    let touchStartX = 0;
    let touchStartY = 0;
    const tolerance = 10; // Allow 10px of movement and still count as a tap

    document.body.addEventListener('touchstart', (e) => {
        const targetElement = e.target.closest('[data-touch-feedback]');
        if (!targetElement) return;

        // targetElement.classList.add('touch-active');
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    document.body.addEventListener('touchend', (e) => {
        const targetElement = e.target.closest('[data-touch-feedback]');
        if (!targetElement) return;

        if (e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            console.log("registered touch movement of:", deltaX, deltaY);
            if (deltaX < tolerance && deltaY < tolerance) {
                console.log("clicked", targetElement);
                targetElement.click();
            }
        }
    });

    document.getElementById('fuel-date').valueAsDate = new Date();
    document.getElementById('odometer-date').valueAsDate = new Date();
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
        localStorage.setItem('lastDomain', domain);
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
        showToast("Refreshing Vehicle List...");
        vehicleList.innerHTML = "";
        fetchVehicles(creds);
    } else {
        showToast("Unable to refresh, try logging in again", 'error');
        loginModal.classList.remove('hidden');
    }
});

backFromFuel.addEventListener('click', () => {
    showView('view-vehicle-list');
});
backFromOdometer.addEventListener('click', () => {
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
        showView(action, { "vehicleId": parseInt(vehicleId, 10) })
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

fuelForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const vehicleId = parseInt(fuelForm.dataset.vehicleId, 10);
    const record = {
        date: event.target.date.value,
        odometer: event.target.odometer.value,
        fuelConsumed: event.target.fuelConsumed.value,
        cost: event.target.cost.value,
        isFillToFull: event.target.isFillToFull.checked,
        missedFuelUp: event.target.missedFuelUp.checked
    };
    const type = 'gas';
    // Call the new function to handle the API call
    addRecord(vehicleId, record, type);
});

odometerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const vehicleId = parseInt(odometerForm.dataset.vehicleId, 10);
    const record = {
        date: event.target.date.value,
        odometer: event.target.odometer.value,
    };
    const type = 'odometer';
    // Call the new function to handle the API call
    addRecord(vehicleId, record, type);
});

// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

