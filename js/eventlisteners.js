import { refreshDataIfStale } from "./state.js";
import { fetchVehicles, addRecord, checkForUpdates } from "./api.js";
import { showView, closeSideMenu, renderSavedEntries, loginModal, showToast, loginForm } from "./ui.js";
const menuButton = document.getElementById('menu-button');
const menuOverlay = document.getElementById('menu-overlay');
const logoutButton = document.getElementById('logout-button');
const closeMenuButton = document.getElementById('close-menu-button');
const refreshButton = document.getElementById('refresh-button');
const updateButton = document.getElementById('update-button');
const fuelForm = document.getElementById('add-fuel-form');
const odometerForm = document.getElementById('add-odometer-form');
const backFromFuel = document.getElementById('back-from-fuel');
const backFromOdometer = document.getElementById('back-from-odometer');
const savedEntriesButton = document.getElementById('saved-entries-button');
const savedEntriesList = document.getElementById('saved-entries-list');
const backFromSaved = document.getElementById('back-from-saved');
const retryAllButton = document.getElementById('retry-all-button');
const vehicleList = document.getElementById('vehicle-list');
const themeSelect = document.getElementById('theme-select');

function setupEventListeners() {
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

    themeSelect.addEventListener('change', () => {
        const currentTheme = localStorage.getItem('theme');
        const newTheme = themeSelect.value;
        document.body.classList.add(newTheme);
        document.body.classList.remove(currentTheme);
        localStorage.setItem('theme', newTheme);
        showToast('Theme saved.');
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
}

export { setupEventListeners, vehicleList, fuelForm, 
    odometerForm, updateButton, retryAllButton,
    savedEntriesList, themeSelect
 };