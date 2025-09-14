import { fetchVehicles } from "./api.js";
import { setupEventListeners } from "./eventlisteners.js";
import { showView, loginForm, loginModal, renderVehicles, showToast } from "./ui.js";
import { refreshDataIfStale } from "./state.js";
// --- App State and DOM Element Constants ---
const domainField = document.getElementById('domain');
const themeSelect = document.getElementById('theme-select');
const refreshIntervalSelect = document.getElementById('refresh-interval-select');





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
    setupEventListeners();
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

