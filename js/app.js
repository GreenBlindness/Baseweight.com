
// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // wait for scripts to load if async? No, script tags are blocking unless async/defer. 
    // We will place them carefully in index.html.

    const { state } = window.App;
    const { renderInventory, renderWalks } = window.App.components;

    const store = await state.initStore();
    const mainEl = document.getElementById('main-content');
    const navBtns = document.querySelectorAll('.nav-btn');

    // Check for Import
    const urlParams = new URLSearchParams(window.location.search);
    const importData = urlParams.get('import');
    let startView = 'inventory';

    if (importData) {
        const { decodeWalkData } = window.App.utils;
        const importedWalk = decodeWalkData(importData);
        if (importedWalk) {
            // "actually it can be editable"
            // So we treat it as a new personal copy immediately.

            // FIX: Don't add to permanent storage immediately. Use transient state.
            store.sharedWalk = importedWalk;
            // store.activeWalkId = importedWalk.id; // No longer needed if we check sharedWalk first

            // Clean URL so refresh doesn't duplicate
            window.history.replaceState({}, document.title, window.location.pathname);

            // setTimeout(() => alert(`Imported "${importedWalk.name}" to your walks!`), 500);
            startView = 'walks';

            // Enable Shared View Mode (Hide Master Inventory)
            document.body.classList.add('mode-shared');
        }
    }

    const routes = {
        inventory: renderInventory,
        walks: renderWalks
    };

    let currentView = startView;

    function navigate(viewName) {
        currentView = viewName;
        navBtns.forEach(btn => {
            if (btn.dataset.view === viewName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const renderFn = routes[viewName];
        if (renderFn) {
            mainEl.innerHTML = '';
            renderFn(mainEl, store);
        }
    }

    // Subscribe to state changes for reactivity
    state.subscribe(() => {
        navigate(currentView);
    });

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            navigate(view);
        });
    });

    // Initial Load
    navigate(currentView);

    // Theme Toggle Logic
    // Theme Toggle Logic
    const themeSwitch = document.getElementById('theme-switch');
    const themeText = document.querySelector('.theme-toggle-text');
    const storedTheme = localStorage.getItem('theme');

    // Check system preference if no stored theme
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    // Helper to set label
    const updateThemeLabel = (isLight) => {
        // User requested: "make it so it says the alternative light when dark etc"
        // If Light Mode (checked) -> Show "Dark Mode" (option to switch)
        // If Dark Mode (unchecked) -> Show "Light Mode" (option to switch)
        themeText.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    };

    // Set initial state
    if (storedTheme === 'light' || (!storedTheme && systemPrefersLight)) {
        document.documentElement.setAttribute('data-theme', 'light');
        themeSwitch.checked = true;
        updateThemeLabel(true);
    } else {
        updateThemeLabel(false);
    }

    themeSwitch.addEventListener('change', (e) => {
        const isLight = e.target.checked;
        if (isLight) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeLabel(isLight);
    });

    // Make whole container clickable (excluding the switch itself which works natively)
    const themeContainer = document.querySelector('.theme-toggle');
    themeContainer.addEventListener('click', (e) => {
        // If clicking the label or input, let native behavior happen
        if (e.target.closest('.theme-switch-label') || e.target.matches('.theme-switch-input')) return;

        // Otherwise (text or gap), toggle manually
        themeSwitch.click();
    });

    // Logo click to reload/home
    document.querySelector('.logo').addEventListener('click', () => {
        navigate('inventory');
    });
});
