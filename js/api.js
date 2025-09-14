import { showToast, loginModal, renderVehicles, toast, toastTimeout } from './ui.js';
import { saveRecordOffline } from './state.js';
import { fuelForm, odometerForm, updateButton } from './eventlisteners.js';



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

export { addRecord, fetchVehicles, checkForUpdates }