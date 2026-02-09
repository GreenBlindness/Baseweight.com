
window.App = window.App || {};

const STORAGE_KEY = 'hiking_packer_data';

// Default Initial State
const defaultState = {
    inventory: [
        { id: '1', name: 'Backpack', weight: 850, unit: 'g', categoryId: 'cat1', isWorn: false, isConsumable: false, notes: '', servings: 1, isOwned: true },
        { id: '2', name: 'Tent', weight: 1200, unit: 'g', categoryId: 'cat2', isWorn: false, isConsumable: false, notes: '', servings: 1, isOwned: true },
        { id: '3', name: 'Sleeping Bag', weight: 600, unit: 'g', categoryId: 'cat2', isWorn: false, isConsumable: false, notes: '', servings: 1, isOwned: true },
        { id: '4', name: 'Stove', weight: 100, unit: 'g', categoryId: 'cat4', isWorn: false, isConsumable: false, notes: '', servings: 1, isOwned: true },
        // Tortillas example for testing
        { id: '5', name: 'Tortillas (Pack)', weight: 320, unit: 'g', categoryId: 'cat4', isWorn: false, isConsumable: true, notes: '8 per pack', servings: 8, isOwned: true }
    ],
    categories: [
        { id: 'cat1', name: 'Packs', color: '#3b82f6' },
        { id: 'cat2', name: 'Shelter', color: '#10b981' },
        { id: 'cat3', name: 'Clothing', color: '#f59e0b' },
        { id: 'cat4', name: 'Cooking', color: '#ef4444' }
    ],
    walks: [],
    recipes: [],
    dreamItems: [],
    settings: {
        weightUnit: 'g'
    }
};

const subscribers = new Set();
const history = {
    past: [],
    future: []
};

window.App.state = {
    store: null,

    subscribe: (fn) => subscribers.add(fn),
    unsubscribe: (fn) => subscribers.delete(fn),

    initStore: async () => {
        const loadFromStorage = () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) return JSON.parse(raw);
            } catch (e) {
                console.error('Failed to load state', e);
            }
            return defaultState;
        };

        const loadedData = loadFromStorage();

        // Ensure structure for potential old data
        if (!loadedData.recipes) loadedData.recipes = [];
        if (!loadedData.dreamItems) loadedData.dreamItems = [];
        // Ensure servings default for old data
        loadedData.inventory.forEach(i => { if (!i.servings) i.servings = 1; });

        const handler = {
            set(target, prop, value) {
                target[prop] = value;
                window.App.state.notify();
                return true;
            },
            get(target, prop) {
                if (typeof target[prop] === 'object' && target[prop] !== null) {
                    return new Proxy(target[prop], {
                        set(nestedTarget, nestedProp, nestedValue) {
                            nestedTarget[nestedProp] = nestedValue;
                            window.App.state.notify();
                            return true;
                        }
                    });
                }
                return target[prop];
            }
        };

        window.App.state.store = new Proxy(loadedData, handler);
        return window.App.state.store;
    },

    notify: () => {
        subscribers.forEach(fn => fn(window.App.state.store));
        try {
            // Strip transient data before saving
            const snapshot = JSON.parse(JSON.stringify(window.App.state.store));
            delete snapshot.sharedWalk;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch (e) {
            console.error('Failed to save state', e);
        }
    },

    // History Helpers
    snapshot: () => {
        // Limit history size to 20
        if (history.past.length > 20) history.past.shift();
        // Deep copy current state
        history.past.push(JSON.parse(JSON.stringify(window.App.state.store)));
        history.future = []; // Clear future on new action
    },

    undo: () => {
        if (history.past.length === 0) return;
        const previous = history.past.pop();
        history.future.push(JSON.parse(JSON.stringify(window.App.state.store))); // Save current to future

        // Restore
        Object.keys(previous).forEach(key => {
            window.App.state.store[key] = previous[key];
        });
    },

    redo: () => {
        if (history.future.length === 0) return;
        const next = history.future.pop();
        history.past.push(JSON.parse(JSON.stringify(window.App.state.store))); // Save current to past

        // Restore
        Object.keys(next).forEach(key => {
            window.App.state.store[key] = next[key];
        });
    },

    actions: {
        addItem: (item) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            const newItem = {
                id: crypto.randomUUID(),
                ...item
            };
            store.inventory = [...store.inventory, newItem];
        },
        removeItem: (id) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            store.inventory = store.inventory.filter(i => i.id !== id);
        },
        addCategory: (name, color) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            store.categories = [...store.categories, { id: crypto.randomUUID(), name, color }];
        },
        updateItem: (id, updates) => {
            // Updating creates a lot of snapshots if on 'input', maybe debounce or only snapshot on blur?
            // For now, let's snapshot, but in UI we might want to be careful. 
            // Actually, rapid typing updates state directly. We probably shouldn't snapshot EVERY keystroke.
            // UI should handle snapshotting for edits explicitly if needed, or we rely on 'blur'.
            // For simplicity in this 'Vanilla' iteration, we WON'T snapshot on simple updates to avoid lag/spam,
            // OR we rely on a flag passed to updateItem? 
            // Let's NOT snapshot on updateItem by default to keep typing smooth.
            // If user deletes, that's a destructive action -> Snapshot.
            // If user finishes editing -> maybe?

            const store = window.App.state.store;
            const index = store.inventory.findIndex(i => i.id === id);
            if (index > -1) {
                const item = store.inventory[index];
                const newInv = [...store.inventory];
                newInv[index] = { ...item, ...updates };
                store.inventory = newInv;
            }
        },
        updateCategory: (id, name) => {
            const store = window.App.state.store;
            const index = store.categories.findIndex(c => c.id === id);
            if (index > -1) {
                const cat = store.categories[index];
                const newCats = [...store.categories];
                newCats[index] = { ...cat, name };
                store.categories = newCats;
            }
        },
        removeCategory: (id) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            store.categories = store.categories.filter(c => c.id !== id);
        },
        // Explicit undo/redo actions exposed to UI
        performUndo: () => window.App.state.undo(),
        performRedo: () => window.App.state.redo(),

        // Walk Actions
        addWalk: (walk) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            store.walks = [...store.walks, walk];
        },
        removeWalk: (id) => {
            window.App.state.snapshot();
            const store = window.App.state.store;
            store.walks = store.walks.filter(w => w.id !== id);
        },
        updateWalk: (id, updates) => {
            // For simple text updates, maybe don't snapshot? 
            // But dragging items/qty changes should probably snapshot.
            // We'll trust the caller (UI) to debounce or we snapshot every time for safety/correctness now.
            window.App.state.snapshot();
            const store = window.App.state.store;
            const index = store.walks.findIndex(w => w.id === id);
            if (index > -1) {
                const walk = store.walks[index];
                const newWalks = [...store.walks];
                newWalks[index] = { ...walk, ...updates };
                store.walks = newWalks;
            }
        }
    }
};
