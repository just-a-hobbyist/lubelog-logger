import { themeSelect } from "./eventlisteners.js";
import { showToast } from "./ui.js";
import { fetchVehicles } from "./api.js";

let toastHistory = [];

/**
 * Gets and sets the theme on initial load of the app
 */
function setTheme() {
    const savedTheme = localStorage.getItem("theme") || "theme-dark"; // Default to dark theme
    document.body.classList.add(savedTheme);
    themeSelect.value = savedTheme;
}

/**
 * Checks to see if there are saved entries waiting to be submitted
 */
function checkSavedEntries() {
    const savedEntries = JSON.parse(localStorage.getItem("savedEntries"));
    if (savedEntries?.length) return savedEntries.length;
    return false;
}

/**
 * Saves a failed record submission to local storage.
 * @param {object} record - The record that failed to submit.
 */
function saveRecordOffline(record) {
    const savedEntries = JSON.parse(localStorage.getItem("savedEntries")) || [];
    record.timestamp = new Date().toISOString(); // Add a timestamp
    savedEntries.push(record);
    localStorage.setItem("savedEntries", JSON.stringify(savedEntries));
    showToast("Network offline. Record saved for later.", "error");
}

/**
 * Checks if cached vehicle data is older than the user-defined threshold and refreshes if needed.
 */
function refreshDataIfStale() {
    const savedCreds = localStorage.getItem("lubeLoggerCreds");
    if (!savedCreds) return;

    const intervalDays = parseInt(
        localStorage.getItem("refreshInterval") || "1",
        10,
    );

    if (intervalDays === -1) {
        console.log("Auto-refresh is disabled by user setting.");
        return;
    }

    const lastFetchTime = localStorage.getItem("lastFetchTime");
    if (!lastFetchTime) return;

    // Convert the selected days into milliseconds for comparison
    const threshold = intervalDays * 24 * 60 * 60 * 1000;
    const timeSinceLastFetch = new Date() - new Date(lastFetchTime);

    if (timeSinceLastFetch > threshold) {
        console.log(
            `Data is stale (older than ${intervalDays} day/s), automatically refreshing...`,
        );
        showToast("Refreshing vehicle list...");
        const creds = JSON.parse(savedCreds);
        fetchVehicles(creds);
    } else {
        console.log("Data is fresh.");
    }
}

/**
 * Loads the stored credentials.
 */
function getCreds() {
    return localStorage.getItem("lubeLoggerCreds");
}

/**
 * Loads the last domain credential.
 */
function getLastDomain() {
    return localStorage.getItem("lastDomain");
}

/**
 * Loads the toast history from localStorage into the state array.
 */
function loadToastHistory() {
    toastHistory = JSON.parse(localStorage.getItem("toastHistory")) || [];
}

/**
 * Adds a new message to the toast history, keeps it at 25 items, and saves it.
 * @param {string} message The message content of the toast.
 * @param {string} type The type of toast ('success' or 'error').
 */
function addToToastHistory(message, type) {
    if (message === "Refreshing vehicle list...") return;

    const newEntry = {
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
    };
    loadToastHistory();
    // Add the new entry and keep the array trimmed to the last 25 items
    toastHistory = [...toastHistory, newEntry].slice(-25);
    localStorage.setItem("toastHistory", JSON.stringify(toastHistory));
}

export {
    saveRecordOffline,
    refreshDataIfStale,
    getCreds,
    getLastDomain,
    setTheme,
    checkSavedEntries,
    loadToastHistory,
    addToToastHistory,
    toastHistory,
};
