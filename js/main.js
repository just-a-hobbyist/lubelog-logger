import { fetchVehicles } from "./api.js";
import { setupEventListeners } from "./eventlisteners.js";
import { loginModal, renderVehicles, showToast } from "./ui.js";
import { refreshDataIfStale, getCreds, getLastDomain, setTheme, checkSavedEntries } from "./state.js";
// --- App State and DOM Element Constants ---
const domainField = document.getElementById('domain');
const refreshIntervalSelect = document.getElementById('refresh-interval-select');


// --- Core App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    setTheme();
    const savedCreds = getCreds();
    const lastDomain = getLastDomain();
    if (lastDomain) domainField.value = lastDomain;
    if (!savedCreds) {
        loginModal.classList.remove('hidden');
    } else {
        const creds = JSON.parse(savedCreds);
        const vehiclesJSON = localStorage.getItem('vehicles');
        if (!vehiclesJSON) {
            showToast('No cached vehicles found, fetching...');
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
        const savedEntries = checkSavedEntries();
        if (savedEntries) showToast(`${savedEntries} entr${savedEntries === 1 ? 'y is' : 'ies are'} saved and waiting to be submitted`);
    }
    
    sessionStorage.removeItem('isRefreshing');
    document.body.classList.remove('loading');
    document.getElementById('fuel-date').valueAsDate = new Date();
    document.getElementById('odometer-date').valueAsDate = new Date();

    setupEventListeners();
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

