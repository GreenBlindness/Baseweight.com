
window.App = window.App || {};
window.App.components = window.App.components || {};

window.App.components.renderInventory = (parentElement, store) => {
    const { actions } = window.App.state;

    // Capture active element details to restore focus (Proactive check)
    let activeElState = null;
    if (document.activeElement && parentElement.contains(document.activeElement)) {
        const el = document.activeElement;
        // Determine "type" and ID
        activeElState = {
            id: el.dataset.id,
            catId: el.dataset.catId, // for new item rows
            class: Array.from(el.classList).find(c => ['name-edit', 'weight-edit', 'toggle-owned', 'cat-name-edit', 'new-item-name', 'new-item-weight'].includes(c)),
            tag: el.tagName,
            selectionStart: el.selectionStart,
            selectionEnd: el.selectionEnd
        };
    }

    const handleFileUpload = (file, itemId) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            actions.updateItem(itemId, { photoUrl: reader.result });
        };
        if (file) reader.readAsDataURL(file);
    };

    window.App.tempFileUpload = (input, id) => {
        if (input.files && input.files[0]) handleFileUpload(input.files[0], id);
    };

    // Main Layout (Centered & Compact)
    parentElement.innerHTML = `
        <div style="width: fit-content; min-width: 35vw; margin: 0 auto;">
            <div class="inventory-controls" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h2>Master Inventory</h2>
                <div style="display:flex; gap:0.5rem;">
                    <button id="undo-btn" class="btn btn-ghost" title="Undo (Ctrl+Z)">↩️ Undo</button>
                    <button id="redo-btn" class="btn btn-ghost" title="Redo (Ctrl+Y)">Redo ↪️</button>
                </div>
            </div>

            <div class="add-category-section" style="margin-bottom:2rem; padding:1rem; border:2px dashed var(--color-border); border-radius:var(--radius-md); text-align:center; background:var(--color-bg-hover);">
                 <input type="text" id="new-cat-name" placeholder="+ New Category Name..." style="background:transparent; border:none; color:var(--color-text-primary); font-size:1rem; text-align:center; width:200px; padding:0.5rem; border-bottom:1px solid var(--color-border);">
                 <button id="add-category-confirm-btn" class="btn btn-ghost" style="margin-left:0.5rem;">Add</button>
            </div>
            
            <div id="inventory-list"></div>
        </div>
    `;

    // Event Listeners: Undo/Redo
    parentElement.querySelector('#undo-btn').addEventListener('click', () => actions.performUndo());
    parentElement.querySelector('#redo-btn').addEventListener('click', () => actions.performRedo());

    // Attach Undo/Redo keys globally once? 
    // Hack: Set a property on window to prevent multiple binds?
    if (!window.App.keyboardInitialized) {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                window.App.state.actions.performUndo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                window.App.state.actions.performRedo();
            }
        });
        window.App.keyboardInitialized = true;
    }


    const listEl = parentElement.querySelector('#inventory-list');

    // Group Items
    const itemsByCat = {};
    store.categories.forEach(cat => itemsByCat[cat.id] = { ...cat, items: [] });
    const uncategorized = { id: 'uncategorized', name: 'Uncategorized', color: '#999', items: [] };

    store.inventory.forEach(item => {
        const catId = item.categoryId;
        if (!item.servings) item.servings = 1;

        if (itemsByCat[catId]) {
            itemsByCat[catId].items.push(item);
        } else {
            uncategorized.items.push(item);
        }
    });

    if (uncategorized.items.length > 0) itemsByCat['uncategorized'] = uncategorized;

    let html = '';

    Object.values(itemsByCat).forEach(cat => {
        const isUncategorized = cat.id === 'uncategorized';

        let headerContent;
        let deleteCatBtn = '';

        if (isUncategorized) {
            headerContent = `<h3 style="margin:0; font-size:1.1rem; color:${cat.color}">${cat.name}</h3>`;
        } else {
            headerContent = `<input type="text" class="cat-name-edit" data-id="${cat.id}" value="${cat.name}" 
                style="margin:0; font-size:1.1rem; font-weight:bold; color:${cat.color}; background:transparent; border:none; width:100%; font-family:inherit;">`;
            deleteCatBtn = `<button class="btn btn-ghost delete-cat-btn" data-id="${cat.id}" title="Delete Category" style="color:var(--color-text-muted); padding:4px;">🗑️</button>`;
        }

        html += `
            <div class="category-group" style="margin-bottom: 1.5rem;">
                <div class="cat-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.25rem; border-bottom: 2px solid ${cat.color}; padding-bottom:0.25rem;">
                    <div style="flex:1; display:flex; align-items:center;">
                        ${headerContent}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:0.8rem; color:var(--color-text-muted)">(${cat.items.length})</span>
                        ${deleteCatBtn}
                    </div>
                </div>
                
                <table class="data-table" style="width:100%; table-layout: auto;">
                    <colgroup>
                        <col style="width: auto;"> <!-- Name -->
                        <col style="width: 70px;"> <!-- Weight -->

                        <col style="width: 40px;"> <!-- Delete -->
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="font-size:0.8rem; padding:4px;">Name</th>
                            <th style="text-align:right; font-size:0.8rem; padding:4px;">Weight</th>
                            <th style="padding:4px; text-align:center;">Own</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        cat.items.forEach(item => {
            html += `
                <tr>
                    <td style="padding:0;">
                         <input type="text" class="edit-field name-edit" data-id="${item.id}" value="${item.name}" 
                            style="width: 100%; min-width: 150px; field-sizing: content; padding:4px; background:transparent; border:none; color:var(--color-text-primary); font-family:inherit; font-weight:600; font-size:0.9rem;">
                    </td>
                    <td style="padding:0;">
                        <div style="display:flex; align-items:center; justify-content:flex-end;">
                            <input type="text" inputmode="decimal" class="edit-field weight-edit" data-id="${item.id}" value="${item.weight}" 
                                style="width:100%; padding:4px 0; text-align:right; background:transparent; border:none; color:var(--color-text-primary); font-family:monospace; font-size:0.9rem;">
                            <span style="color:var(--color-text-muted); font-size:0.8rem; padding-left:2px; padding-right:4px;">g</span>
                        </div>
                    </td>

                    <td style="text-align:center; padding:0;">
                        <input type="checkbox" class="toggle-owned" data-id="${item.id}" ${item.isOwned ? 'checked' : ''} title="Owned / Wishlist">
                    </td>
                    <td style="text-align:center; padding:0;">
                        <button class="btn btn-ghost delete-btn" data-id="${item.id}" style="padding:4px; color:var(--color-text-muted); font-size:1rem; line-height:1;" title="Delete">×</button>
                    </td>
                </tr>
            `;
        });

        // Add Row
        html += `
                        <tr class="add-item-row" style="background:rgba(255,255,255,0.02);">
                            <td style="padding:0;">
                                <input type="text" class="new-item-name" data-cat-id="${cat.id}" placeholder="+" style="width:100%; padding:4px; background:transparent; border:none; color:var(--color-text-muted); font-family:inherit; font-size:0.9rem;">
                            </td>
                            <td style="padding:0;">
                                <div style="display:flex; align-items:center; justify-content:flex-end;">
                                    <input type="text" inputmode="decimal" class="new-item-weight" data-cat-id="${cat.id}" placeholder="0" style="width:100%; padding:4px 0; text-align:right; background:transparent; border:none; color:var(--color-text-muted); font-family:monospace; font-size:0.9rem;">
                                    <span style="color:var(--color-text-muted); font-size:0.8rem; padding-left:2px; padding-right:4px;">g</span>
                                </div>
                            </td>

                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    listEl.innerHTML = html;

    // Restore Focus (Priority: 1. Explicit override, 2. Proactive state)
    if (window.App.inventoryFocusCatId) {
        const selector = `.new-item-${window.App.inventoryFocusField || 'name'}[data-cat-id="${window.App.inventoryFocusCatId}"]`;
        const el = parentElement.querySelector(selector);
        if (el) {
            el.focus();
            if (el.select) el.select();
        }
        window.App.inventoryFocusCatId = null;
        window.App.inventoryFocusField = null;
    } else if (activeElState) {
        let selector = '';
        if (activeElState.class) {
            selector = `.${activeElState.class}`;
            if (activeElState.id) selector += `[data-id="${activeElState.id}"]`;
            if (activeElState.catId) selector += `[data-cat-id="${activeElState.catId}"]`;
        } else if (activeElState.id) {
            // Fallback: If class matching failed, try ID
            selector = `[data-id="${activeElState.id}"]`;
        } else if (activeElState.catId && activeElState.tag === 'INPUT') {
            // Fallback for new items (approximate)
            selector = `input[data-cat-id="${activeElState.catId}"]`;
        }

        if (selector) {
            // Try to find exact match
            let elToFocus = parentElement.querySelector(selector);

            // Refine selector for specific new-item fields if simple selector is ambiguous
            if (!elToFocus && activeElState.class) {
                elToFocus = parentElement.querySelector(`.${activeElState.class}`);
            }

            if (elToFocus) {
                elToFocus.focus();
                if ((elToFocus.tagName === 'INPUT' || elToFocus.tagName === 'TEXTAREA') && activeElState.selectionStart != null) {
                    try {
                        elToFocus.setSelectionRange(activeElState.selectionStart, activeElState.selectionEnd);
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }
    }

    // ... (rest of code) ...

    const handleCreateCategory = () => {
        const input = parentElement.querySelector('#new-cat-name');
        const name = input.value.trim();
        if (name) {
            // Extended Palette for distinct colors
            const palette = [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
                '#6366f1', '#d946ef', '#e11d48', '#22c55e', '#eab308',
                '#64748b', '#a855f7', '#0ea5e9', '#f43f5e', '#10b981'
            ];

            const usedColors = new Set(store.categories.map(c => c.color));
            // Find first unused color
            let color = palette.find(c => !usedColors.has(c));

            // If all used, generate a random HSL
            if (!color) {
                const hue = Math.floor(Math.random() * 360);
                color = `hsl(${hue}, 70%, 50%)`;
            }

            actions.addCategory(name, color);
        }
    };

    const newCatInput = parentElement.querySelector('#new-cat-name');
    if (newCatInput) {
        newCatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCreateCategory();
        });
    }

    const newCatBtn = parentElement.querySelector('#add-category-confirm-btn');
    if (newCatBtn) {
        newCatBtn.addEventListener('click', handleCreateCategory);
    }

    // 1. Existing Edit Fields (Enter -> Jump to Add; Ctrl+Delete -> Remove)
    parentElement.querySelectorAll('.edit-field').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentRow = e.target.closest('tr');

                // Name -> Weight
                if (e.target.classList.contains('name-edit')) {
                    const weightInput = currentRow.querySelector('.weight-edit');
                    if (weightInput) {
                        weightInput.focus();
                        weightInput.select();
                    }
                }
                // Weight -> Next Row Name (or Add Row Name)
                else if (e.target.classList.contains('weight-edit')) {
                    const nextRow = currentRow.nextElementSibling;
                    if (nextRow) {
                        // Check if it's an item row or add-item row
                        const nextNameInput = nextRow.querySelector('.name-edit, .new-item-name');
                        if (nextNameInput) {
                            nextNameInput.focus();
                            nextNameInput.select();
                        }
                    }
                }
            }
            if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const id = e.target.dataset.id;
                actions.removeItem(id);
            }
        });
    });

    // Helper: Debounce
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Handlers
    const handleEdit = (id, field, value) => {
        const updates = {};
        if (field === 'name') updates.name = value;
        if (field === 'weight') {
            // Allow intermediate states for decimal typing
            if (value === '' || value === '-' || value.endsWith('.') || (value.includes('.') && value.endsWith('0'))) {
                updates.weight = value;
            } else {
                const parsed = parseFloat(value);
                updates.weight = isNaN(parsed) ? 0 : parsed;
            }
        }
        actions.updateItem(id, updates);
    };

    const debouncedHandleEdit = debounce(handleEdit, 300); // reduced delay slightly for responsiveness

    const handleCatEdit = (id, value) => {
        actions.updateCategory(id, value);
    };

    const debouncedHandleCatEdit = debounce(handleCatEdit, 300);

    // Event Listeners for Edit Fields
    parentElement.querySelectorAll('.cat-name-edit').forEach(input => {
        input.addEventListener('input', (e) => debouncedHandleCatEdit(e.target.dataset.id, e.target.value));
    });

    parentElement.querySelectorAll('.edit-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = e.target.dataset.id;
            let field = 'name';
            if (e.target.classList.contains('weight-edit')) field = 'weight';
            debouncedHandleEdit(id, field, e.target.value);
        });
    });

    // Unit Change - Immediate


    // 2. Global Shortcuts (Undo/Redo) - Ensure single listener
    if (!window.App.globalKeysBound) {
        document.addEventListener('keydown', (e) => {
            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                window.App.state.actions.performUndo();
            }
            // Redo: Ctrl+Shift+Z OR Ctrl+Y
            if ((e.ctrlKey || e.metaKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                window.App.state.actions.performRedo();
            }
        });
        window.App.globalKeysBound = true;
    }

    // Events
    parentElement.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            actions.removeItem(deleteBtn.dataset.id);
            return; // Stop propagation
        }

        const deleteCatBtn = e.target.closest('.delete-cat-btn');
        if (deleteCatBtn) {
            window.App.utils.confirmAction(
                'Are you sure you want to delete this category? Any items will be moved to Uncategorized.',
                () => actions.removeCategory(deleteCatBtn.dataset.id)
            );
            return;
        }
    });

    parentElement.querySelectorAll('.toggle-owned').forEach(cb => {
        cb.addEventListener('change', (e) => {
            actions.updateItem(e.target.dataset.id, { isOwned: e.target.checked });
        });
    });

    const handleAdd = (catId, nameInput, weightInput) => {
        const name = nameInput.value.trim();
        if (!name) return;
        const weight = parseFloat(weightInput.value) || 0;

        const row = nameInput.closest('tr');
        const unit = 'g';

        window.App.inventoryFocusCatId = catId;
        window.App.inventoryFocusField = 'name';
        window.App.invEditFocusId = null;

        actions.addItem({ name, weight, unit, categoryId: catId, photoUrl: null, servings: 1, isOwned: true });
    };

    // Keyboard Navigation Logic (Excel-style)
    const handleNavigation = (e) => {
        // Only handle Arrow Keys
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const currentInput = e.target;
        const currentRow = currentInput.closest('tr');
        if (!currentRow) return;

        const isText = currentInput.type === 'text' || currentInput.type === 'search'; // Now includes weights
        const isSelect = currentInput.tagName === 'SELECT';
        const isCheckbox = currentInput.type === 'checkbox';

        // 1. Up / Down (Row Navigation)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // For Selects, we prioritize navigation over changing options to match "speed" request.
            // Users can type letters to change units or use mouse.
            e.preventDefault();

            let selector;
            if (currentInput.classList.contains('name-edit') || currentInput.classList.contains('new-item-name')) {
                selector = '.name-edit, .new-item-name';
            } else if (currentInput.classList.contains('weight-edit') || currentInput.classList.contains('new-item-weight')) {
                selector = '.weight-edit, .new-item-weight';
            } else if (currentInput.classList.contains('toggle-owned')) {
                selector = '.toggle-owned';
            } else {
                return;
            }

            const direction = e.key === 'ArrowUp' ? -1 : 1;
            const rows = Array.from(parentElement.querySelectorAll('tbody tr'));
            const currentIndex = rows.indexOf(currentRow);
            const targetRow = rows[currentIndex + direction];

            if (targetRow) {
                const targetInput = targetRow.querySelector(selector);
                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.select) targetInput.select();
                }
            }
        }

        // 2. Left / Right (Column Navigation)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // Edge Detection Logic
            let shouldMove = false;

            // Ctrl+Arrow ALWAYS moves (Power User override)
            if (e.ctrlKey || e.metaKey) shouldMove = true;

            else if (isText) {
                const cursorStart = currentInput.selectionStart;
                const cursorEnd = currentInput.selectionEnd;
                const valueLen = currentInput.value.length;

                // Only move if cursor is single (not range) and at edge
                if (cursorStart === cursorEnd) {
                    if (e.key === 'ArrowLeft' && cursorStart === 0) shouldMove = true;
                    if (e.key === 'ArrowRight' && cursorStart === valueLen) shouldMove = true;
                }
            } else if (isSelect || isCheckbox) {
                // Always move for non-text inputs (unless captured by select native nav? No, preventDefault handles it)
                shouldMove = true;
            }

            if (shouldMove) {
                e.preventDefault();

                // Get all navigable elements in this row
                const navigable = Array.from(currentRow.querySelectorAll(
                    '.name-edit, .new-item-name, ' +
                    '.weight-edit, .new-item-weight, ' +
                    '.toggle-owned' // Exclude delete button
                ));

                const currentIndex = navigable.indexOf(currentInput);
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const targetInput = navigable[currentIndex + direction];

                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.select) targetInput.select();
                }
            }
        }
    };

    // Attach to all relevant inputs
    const allInputs = parentElement.querySelectorAll('.edit-field, .new-item-name, .new-item-weight, .toggle-owned');
    allInputs.forEach(input => {
        input.addEventListener('keydown', handleNavigation);
    });

    // Enter Key Logic (Add) - Modified to prevent conflicting listeners if we were to attach blindly
    const attachAddEnter = (input) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const catId = e.target.dataset.catId;

                // Name -> Weight
                if (e.target.classList.contains('new-item-name')) {
                    const row = e.target.closest('tr');
                    const weightInput = row.querySelector('.new-item-weight');
                    if (weightInput) {
                        weightInput.focus();
                        weightInput.select();
                    }
                }
                // Weight -> Add Item -> Focus Name
                else if (e.target.classList.contains('new-item-weight')) {
                    const nameInput = parentElement.querySelector(`.new-item-name[data-cat-id="${catId}"]`);
                    const weightInput = parentElement.querySelector(`.new-item-weight[data-cat-id="${catId}"]`);
                    handleAdd(catId, nameInput, weightInput);
                }
            }
        });
    };

    parentElement.querySelectorAll('.new-item-name').forEach(attachAddEnter);
    parentElement.querySelectorAll('.new-item-weight').forEach(attachAddEnter);
};
