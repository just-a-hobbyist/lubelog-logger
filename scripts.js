// --- App State and DOM Element Constants ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const vehicleList = document.getElementById('vehicle-list');
const refreshButton = document.getElementById('refresh-button');
const toast = document.getElementById('toast-notification');
const domainField = document.getElementById('domain');
const menuButton = document.getElementById('menu-button');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const logoutButton = document.getElementById('logout-button');
const closeMenuButton = document.getElementById('close-menu-button');
const addOdoOdoHeader = document.getElementById('odometer-form-title');
const addOdoOdoEntry = document.getElementById('odometer-odometer');
const addFuelOdoEntry = document.getElementById('fuel-odometer');
const fuelForm = document.getElementById('add-fuel-form');
const odometerForm = document.getElementById('add-odometer-form');
const fuelFormTitle = document.getElementById('fuel-form-title');
const odometerFormTitle = document.getElementById('odometer-form-title');
const backFromFuel = document.getElementById('back-from-fuel');
const backFromOdometer = document.getElementById('back-from-odometer');
const viewSavedEntries = document.getElementById('view-saved-entries');
const savedEntriesButton = document.getElementById('saved-entries-button');
const savedEntriesList = document.getElementById('saved-entries-list');
const backFromSaved = document.getElementById('back-from-saved');
const retryAllButton = document.getElementById('retry-all-button');
const updateButton = document.getElementById('update-button');
const themeSelect = document.getElementById('theme-select');
const refreshIntervalSelect = document.getElementById('refresh-interval-select');

// Views
const vehicleListView = document.getElementById('view-vehicle-list');
const addFuelView = document.getElementById('view-add-fuel');
const addOdometerView = document.getElementById('view-add-odometer');

// App State
let vehiclesCache = []; // In-memory cache for vehicle data
let toastTimeout; // To manage toast timer

/**
 * Manages which view is currently visible.
 * @param {string} viewId - The id of the view to show.
 * @param {object} [data] - Optional data for the view.
 * @param {boolean} isHistoryNavigation - Whether or not the user is trying to navigate the browser history.
 */
function showView(viewId, data, isHistoryNavigation = false) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }

    // Add a new entry to the browser's history unless we're navigating via the back button
    if (!isHistoryNavigation) {
        const url = `#${viewId}`;
        history.pushState({ viewId, data }, '', url);
    }

    if (viewId === 'view-add-fuel') {
        const vehicle = vehiclesCache.find(v => v.vehicleData.id === data.vehicleId);
        if (vehicle) {
            fuelFormTitle.textContent = `Add Fuel for ${vehicle.vehicleData.year} ${vehicle.vehicleData.make}`;
            fuelForm.dataset.vehicleId = data.vehicleId;
            if (vehicle.vehicleData.odometerOptional === true) addFuelOdoEntry.required = false;
            else addFuelOdoEntry.required = true;
        }
    } else if (viewId === 'view-add-odometer') {
        const vehicle = vehiclesCache.find(v => v.vehicleData.id === data.vehicleId);
        if (vehicle) {
            odometerFormTitle.textContent = `Add ${vehicle.vehicleData.useHours ? "Engine Hours" : "Odometer"} for ${vehicle.vehicleData.year} ${vehicle.vehicleData.make}`;
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
    let vehicleIdentifier;
    if (vehicle.vehicleData.vehicleIdentifier !== "LicensePlate") {
        const identBy = vehicle.vehicleData.vehicleIdentifier;
        vehicleIdentifier = vehicle.vehicleData.extraFields.map(fld => {
            if (fld.name === identBy) return fld.value
        });
    } else vehicleIdentifier = vehicle.vehicleData.licensePlate || 'No Plate';

    // Use optional chaining to safely get the odometer reading.
    const latestOdometer = vehicle.lastReportedOdometer?.toString() || 'N/A';
    const hrsOdo = vehicle.vehicleData.useHours ? "Engine Hours" : "Odometer";

    return `
        <li class="vehicle-card" data-vehicle-id="${vehicle.vehicleData.id}" data-hours-odometer="${hrsOdo}" data-touch-feedback>
            <div class="card-header">
                <div class="card-info">
                    <h2>${vehicleName}</h2>
                    <p>${vehicleIdentifier}</p>
                </div>
                <div class="chevron-icon icon"></div>
            </div>
            <div class="card-details">
                <div class="odometer-info">
                    <span>Last Reported ${hrsOdo}</span>
                    <strong>${latestOdometer}</strong>
                </div>
                <div class="action-buttons">
                    <button class="action-btn" data-action="view-add-fuel" data-hours-odometer="${hrsOdo}" data-touch-feedback>New Fuel Record</button>
                    <button class="action-btn" data-action="view-add-odometer" data-hours-odometer="${hrsOdo}" data-touch-feedback>New ${hrsOdo} Record</button>
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
 * Renders the list of saved (offline) entries into the DOM.
 */
function renderSavedEntries(entriesToRender) {
    const savedEntries = entriesToRender 
        ? entriesToRender 
        : JSON.parse(localStorage.getItem('savedEntries')) || [];
    if (savedEntries.length === 0) {
        savedEntriesList.innerHTML = '<li><p class="no-vehicles-message">No saved entries.</p></li>';
        retryAllButton.style.display = 'none'; // Hide button if no entries
        return;
    }

    retryAllButton.style.display = 'block'; // Show button if there are entries
    savedEntriesList.innerHTML = savedEntries.map((entry, index) => {
        const vehicle = vehiclesCache.find(v => v.vehicleData.id === entry.vehicleId);
        const vehicleName = vehicle ? `${vehicle.vehicleData.year} ${vehicle.vehicleData.make} ${vehicle.vehicleData.model}` : 'Unknown Vehicle';
        const entryType = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
        const timestamp = new Date(entry.timestamp).toLocaleString();

        return `
            <li class="saved-entry-card" data-entry-index="${index}">
                <p><strong>Vehicle:</strong> ${vehicleName}</p>
                <p><strong>Type:</strong> ${entryType} Record</p>
                <p class="timestamp">Saved: ${timestamp}</p>
                <div class="saved-entry-actions">
                    <button class="action-btn retry-btn" data-touch-feedback>Retry</button>
                    <button class="action-btn delete-btn" data-touch-feedback>Delete</button>
                </div>
            </li>
        `;
    }).join('');
}

/**
 * Saves a failed record submission to local storage.
 * @param {object} record - The record that failed to submit.
 */
function saveRecordOffline(record) {
    const savedEntries = JSON.parse(localStorage.getItem('savedEntries')) || [];
    record.timestamp = new Date().toISOString(); // Add a timestamp
    savedEntries.push(record);
    localStorage.setItem('savedEntries', JSON.stringify(savedEntries));
    showToast('Network offline. Record saved for later.', 'error');
}

/**
 * Fetches the list of vehicles from the LubeLogger API.
 * @param {object} credentials - The user's credentials object.
 */
async function fetchVehicles(credentials) {
    console.log("Attempting to fetch vehicles");

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
        console.log("Successfully fetched vehicles");
        localStorage.setItem("vehicles", JSON.stringify(vehicles));
        localStorage.setItem('lastFetchTime', new Date().toISOString());
        renderVehicles(vehicles);
        if (toastTimeout && toast.textContent === "Refreshing Vehicle List...") {
            clearTimeout(toastTimeout);
            toast.classList.remove('active');
        }

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
 * @param {boolean} [autoHide = true] - Indicates whether the toast will autohide after given time period.
 */
function showToast(content, type = 'success', autoHide = true) {
    if (toastTimeout) clearTimeout(toastTimeout);

    toast.innerHTML = ''; 

    if (typeof content === 'string') {
        toast.textContent = content;
    } else {
        toast.appendChild(content); // Append the element if it's not a string
    }
    
    toast.className = 'toast';
    toast.classList.add(type);
    toast.classList.add('active');

    if (autoHide) {
        toastTimeout = setTimeout(() => toast.classList.remove('active'), 3000);
    }
}

/**
 * Submits a new record to the LubeLogger API.
 * @param {number} vehicleId - The ID of the vehicle.
 * @param {object} record - The gas record data.
 * @param {string} type - The type ['gas' or 'odometer'] of record to submit
 */
async function addRecord(vehicleId, record, type, isRetry = false) {
    let formType;
    let dateBox;
    let successMsg = " record saved successfully!";
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

    if (!isRetry) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
    }
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
            if (record[key] != null && record[key] !== '') {
                formData.append(key, record[key]);
            }
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
        console.log("Successfully added record");
        showToast(successMsg);
        if (!isRetry) {
            submitButton.textContent = "Refreshing Home Page";
            await fetchVehicles(credentials);
            history.back();
        }
        formType.reset();
        dateBox.valueAsDate = new Date();
        return true;
    } catch (error) {
        console.error(`Failed to add ${type} record:`, error);

        // Check for a network error specifically
        if (error instanceof TypeError && error.message === 'Failed to fetch' && !isRetry) {
            saveRecordOffline({ vehicleId, record, type });
            showView('view-vehicle-list'); // Go back to the list after saving
            formType.reset();
            dateBox.valueAsDate = new Date();        
        } else {
            showToast(`Error: ${error.message}`, 'error');
        }
        return false;
    } finally {
        if (!isRetry) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

/**
 * Closes the Side Menu
 */
function closeSideMenu() {
    document.body.classList.remove('menu-open');
}

/**
 * Compares x.y.z formatted update versions
 * @param {string} cur - The version of the current app
 * @param {string} upd - The version of the update
 * @returns {boolean} - True if upd is higher version than cur
 */
function compareVersions(cur, upd) {
    const versionError = new Error(`Version error: either ${cur} or ${upd} is an invalid version number!`);
    const current = cur.split('.').filter(Boolean).map(Number);
    const updated = upd.split('.').filter(Boolean).map(Number);
    if (current.length !== updated.length) {
        console.error(versionError);
        showToast('Version error, please contact the developer!', 'error');
        return false;
    }

    let outOfOrder = false;
    return current.some((part, i) => {
        if (isNaN(part) || isNaN(updated[i])) {
            console.error(versionError);
            showToast('Version error, please contact the developer!', 'error');
        }
        if (outOfOrder) return false;
        if (part > updated[i]) {
            outOfOrder = true;
            return false;
        }
        return (updated[i] > part);
    });
}

/**
 * Checks for updates, first against the central repo, then the local service worker.
 */
async function checkForUpdates() {
    updateButton.textContent = 'Checking...';
    updateButton.disabled = true;

    try {
        // Step 1: Get current version
        const localVersionResponse = await fetch('./version.json');
        const localVersion = await localVersionResponse.json();
        const currentVersion = localVersion.version;

        // Step 2: Check the official GitHub repo to see if a new version exists.
        const response = await fetch('https://just-a-hobbyist.github.io/lubelog-logger/version.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Could not contact update server.');
        const remoteServerVersion = await response.json();

        // Step 3: Compare the official version with the version of the code the user is running.
        if (compareVersions(currentVersion, remoteServerVersion.version)) {
            // If a new version exists, inform the user they need to update their server.
            updateButton.textContent = 'Update Available!';
            updateButton.classList.add('update-available');
            showToast(`Version ${remoteServerVersion.version} is available! Please update your server via 'git pull'.`);
        } else {
            // Step 4: If versions match, the user has the latest code.
            // Now, we can safely check if their service worker is installed correctly.
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.update();
            updateButton.textContent = 'Check for Updates';
            showToast('You are on the latest version.');
        }
    } catch (error) {
        console.error('Update check failed:', error);
        updateButton.textContent = 'Check for Updates';
        showToast('Update check failed.', 'error');
    } finally {
        updateButton.disabled = false;
    }
}

/**
 * Shows a custom toast notification prompting the user to reload to apply an update.
 */
function showUpdateNotification() {
    const toastContent = document.createElement('div');
    toastContent.style.display = 'flex';
    toastContent.style.alignItems = 'center';
    toastContent.textContent = "A new version is ready! ";

    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Reload';
    reloadButton.style.marginLeft = '1rem';
    reloadButton.style.border = '1px solid white';
    reloadButton.style.background = 'transparent';
    reloadButton.style.color = 'white';
    reloadButton.style.borderRadius = '5px';
    reloadButton.style.padding = '5px 10px';
    reloadButton.style.cursor = 'pointer';

    reloadButton.onclick = () => {
        // Find the waiting service worker and tell it to take over.
        navigator.serviceWorker.getRegistration().then(reg => {
            reg.waiting.postMessage({ action: 'skipWaiting' });
        });
    };

    toastContent.appendChild(reloadButton);
    showToast(toastContent, 'success', false);
}

/**
 * Checks if cached vehicle data is older than the user-defined threshold and refreshes if needed.
 */
function refreshDataIfStale() {
    const savedCreds = localStorage.getItem('lubeLoggerCreds');
    if (!savedCreds) return;

    const intervalDays = parseInt(localStorage.getItem('refreshInterval') || '1', 10);

    if (intervalDays === -1) {
        console.log("Auto-refresh is disabled by user setting.");
        return;
    }

    const lastFetchTime = localStorage.getItem('lastFetchTime');
    if (!lastFetchTime) return;

    // Convert the selected days into milliseconds for comparison
    const threshold = intervalDays * 24 * 60 * 60 * 1000;
    const timeSinceLastFetch = new Date() - new Date(lastFetchTime);

    if (timeSinceLastFetch > threshold) {
        console.log(`Data is stale (older than ${intervalDays} day/s), automatically refreshing...`);
        showToast("Refreshing vehicle list...");
        const creds = JSON.parse(savedCreds);
        fetchVehicles(creds);
    } else {
        console.log("Data is fresh.");
    }
}

// --- Core App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'theme-dark'; // Default to dark theme
    document.body.classList.add(savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', () => {
        const currentTheme = localStorage.getItem('theme');
        const newTheme = themeSelect.value;
        document.body.classList.add(newTheme);
        document.body.classList.remove(currentTheme);
        localStorage.setItem('theme', newTheme);
        showToast('Theme saved.');
    });
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
            const savedInterval = localStorage.getItem('refreshInterval') || '1';
            refreshIntervalSelect.value = savedInterval;
            refreshIntervalSelect.addEventListener('change', () => {
                localStorage.setItem('refreshInterval', refreshIntervalSelect.value);
            })
            refreshDataIfStale();
        }
    }
    // --- Touch Tolerance & Feedback Handler ---
    let touchStartX = 0;
    let touchStartY = 0;
    const tolerance = 10;

    document.body.addEventListener('touchstart', (e) => {
        const targetElement = e.target.closest('[data-touch-feedback]');
        if (!targetElement) return;

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
            if (deltaX < tolerance && deltaY < tolerance) {
                targetElement.click();
            }
        }
    });
    sessionStorage.removeItem('isRefreshing');
    document.body.classList.remove('loading');
    document.getElementById('fuel-date').valueAsDate = new Date();
    document.getElementById('odometer-date').valueAsDate = new Date();

    // Listen for browser back/forward navigation (phone's back button)
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.viewId) {
            showView(event.state.viewId, event.state.data, true);
        } else {
            showView('view-vehicle-list', {}, true);
        }
    });
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

refreshButton.addEventListener('mouseup', () => {
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

backFromFuel.addEventListener('mouseup', () => {
    history.back();
});
backFromOdometer.addEventListener('mouseup', () => {
    history.back();
});

updateButton.addEventListener('click', () => {
    checkForUpdates();
});

menuButton.addEventListener('mouseup', () => {
    if (document.body.classList.contains('menu-open')){
        closeSideMenu();
    } else {
        document.body.classList.add('menu-open');
    }
});

menuOverlay.addEventListener('mouseup', () => {
    closeSideMenu();
});

closeMenuButton.addEventListener('mouseup', () => {
    closeSideMenu();
});

logoutButton.addEventListener('mouseup', () => {
    localStorage.removeItem('lubeLoggerCreds');
    localStorage.removeItem('vehicles');
    closeSideMenu();
    vehicleList.innerHTML = '';
    showView('view-vehicle-list');
    loginModal.classList.remove('hidden');
    showToast("You have been logged out.");
});

// Event listener for all interactions within the vehicle list
vehicleList.addEventListener('mouseup', (event) => {
    // Case 1: An action button inside the details was clicked
    const actionButton = event.target.closest('.action-btn');
    if (actionButton) {
        event.stopPropagation(); 
        
        const action = actionButton.dataset.action;
        const card = actionButton.closest('.vehicle-card');
        const vehicleId = card.dataset.vehicleId;

        const odoSpans = document.getElementsByName('hours-odometer');
        odoSpans.forEach(sp => {
            if (actionButton.dataset.hoursOdometer === "Odometer") sp.innerText = "Odometer";
            else sp.innerText = "Engine Hours";
        })
        
        showView(action, { "vehicleId": parseInt(vehicleId, 10) })
        return;
    }

    // Case 2: The card header was clicked to expand/collapse
    const clickedHeader = event.target.closest('.card-header');
    if (clickedHeader) {
        const card = clickedHeader.closest('.vehicle-card');
        if (!card) return;

        const isAlreadyExpanded = card.classList.contains('expanded');

        document.querySelectorAll('.vehicle-card.expanded').forEach(openCard => {
            openCard.classList.remove('expanded');
        });

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
        odometer: event.target.odometer.value || 0,
        fuelConsumed: event.target.fuelConsumed.value,
        cost: event.target.cost.value,
        isFillToFull: event.target.isFillToFull.checked,
        missedFuelUp: event.target.missedFuelUp.checked,
        notes: event.target.notes.value,
        tags: event.target.tags.value,
    };
    const type = 'gas';
    console.log(record)
    addRecord(vehicleId, record, type);
});

odometerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const vehicleId = parseInt(odometerForm.dataset.vehicleId, 10);
    const record = {
        date: event.target.date.value,
        odometer: event.target.odometer.value,
        notes: event.target.notes.value,
        tags: event.target.tags.value,
    };
    const type = 'odometer';
    addRecord(vehicleId, record, type);
});

savedEntriesButton.addEventListener('mouseup', () => {
    closeSideMenu();
    renderSavedEntries();
    showView('view-saved-entries');
});

backFromSaved.addEventListener('mouseup', () => {
    history.back();
});

savedEntriesList.addEventListener('mouseup', async (event) => {
    const target = event.target;
    const card = target.closest('.saved-entry-card');
    if (!card) return;

    const entryIndex = parseInt(card.dataset.entryIndex, 10);
    let savedEntries = JSON.parse(localStorage.getItem('savedEntries')) || [];
    const entry = savedEntries[entryIndex];

    if (target.classList.contains('retry-btn')) {
        target.textContent = 'Retrying...';
        target.disabled = true;
        const success = await addRecord(entry.vehicleId, entry.record, entry.type, true);
        if (success) {
            savedEntries.splice(entryIndex, 1);
            localStorage.setItem('savedEntries', JSON.stringify(savedEntries));
            renderSavedEntries();
        } else {
            target.textContent = 'Retry';
            target.disabled = false;
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this saved entry?')) {
            savedEntries.splice(entryIndex, 1);
            localStorage.setItem('savedEntries', JSON.stringify(savedEntries));
            renderSavedEntries();
            showToast('Entry deleted.');
        }
    }
});

retryAllButton.addEventListener('mouseup', async () => {
    let savedEntries = JSON.parse(localStorage.getItem('savedEntries')) || [];
    if (savedEntries.length === 0) return;
    const entriesToRender = savedEntries.map(e => e);

    showToast(`Attempting to submit ${savedEntries.length} saved entries...`);
    let remainingEntries = [];
    
    for (const entry of savedEntries) {
        const success = await addRecord(entry.vehicleId, entry.record, entry.type, true);
        if (!success) {
            remainingEntries.push(entry); // Keep it if it failed
        } else {
            const entryIndex = savedEntries.findIndex(e => e.timestamp === entry.timestamp);
            entriesToRender.splice(entryIndex, 1);
            renderSavedEntries(entriesToRender);
        }
    }

    localStorage.setItem('savedEntries', JSON.stringify(remainingEntries));
    renderSavedEntries(); // Re-render with any remaining entries
    showToast(`Finished. ${savedEntries.length - remainingEntries.length} entries submitted.`);
});

document.querySelectorAll('.form-expander-header').forEach(header => {
    header.addEventListener('mouseup', () => {
        header.closest('.record-form').classList.toggle('expanded');
    });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("App brought into focus.");
        refreshDataIfStale();
    }
});

// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            updateButton.textContent = 'Install Update';
                            updateButton.classList.add('update-available');
                            updateButton.disabled = false;
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (sessionStorage.getItem('isRefreshing')) return;
            sessionStorage.setItem('isRefreshing', 'true');
            window.location.reload();
        });
    });
}

