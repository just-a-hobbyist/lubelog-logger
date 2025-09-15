import { vehicleList, fuelForm, odometerForm, retryAllButton, savedEntriesList } from "./eventlisteners.js";
// Views and elements
// const vehicleListView = document.getElementById('view-vehicle-list');
// const addFuelView = document.getElementById('view-add-fuel');
// const addOdometerView = document.getElementById('view-add-odometer');
// const viewSavedEntries = document.getElementById('view-saved-entries');
// const addOdoOdoHeader = document.getElementById('odometer-form-title');
// const addOdoOdoEntry = document.getElementById('odometer-odometer');
const addFuelOdoEntry = document.getElementById('fuel-odometer');
const fuelFormTitle = document.getElementById('fuel-form-title');
const odometerFormTitle = document.getElementById('odometer-form-title');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const toast = document.getElementById('toast-notification');
let vehiclesCache = [];
let toastTimeout;

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
 * Closes the Side Menu
 */
function closeSideMenu() {
    document.body.classList.remove('menu-open');
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

export { showUpdateNotification, renderSavedEntries, 
    showView, closeSideMenu, loginForm, loginModal, 
    renderVehicles, showToast, toast, toastTimeout,
 };