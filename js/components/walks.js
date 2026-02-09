
window.App = window.App || {};
window.App.components = window.App.components || {};

window.App.components.renderWalks = (parentElement, store) => {
    const { generateId, formatWeight, sumWeights, renderPieChart } = window.App.utils;
    const { actions } = window.App.state;

    // Check for Shared Walk (Imported View)
    if (store.sharedWalk) {
        // If viewing a shared walk, render it directly without sidebar logic
        renderWalkDetail(parentElement, store, store.sharedWalk.id, true);
        return;
    }

    // Auto-select first walk if none active
    if (!store.activeWalkId && store.walks.length > 0) {
        store.activeWalkId = store.walks[0].id;
    }

    // If absolutely no walks, create one default
    if (store.walks.length === 0) {
        const newWalk = {
            id: generateId(),
            name: "New List",
            date: new Date().toISOString(),
            items: [],
            days: 1
        };
        actions.addWalk(newWalk);
        store.activeWalkId = newWalk.id;
    }

    renderWalkDetail(parentElement, store, store.activeWalkId);

    // renderWalkList removed - we always show the workspace layout


    function renderWalkDetail(parentElement, store, walkId, isShared = false) {
        try {
            let walk;
            if (isShared) {
                // Determine shared walk - fallback to normal if missing to avoid blank screen
                if (!store.sharedWalk) {
                    console.error("Shared walk missing, reverting to default.");
                    store.activeWalkId = null;
                    return window.App.components.renderWalks(parentElement, store);
                }
                walk = store.sharedWalk;
            } else {
                walk = store.walks.find(w => w.id === walkId);
            }

            if (!walk) {
                store.activeWalkId = null;
                return window.App.components.renderWalks(parentElement, store);
            }

            // --- CALCULATION LOGIC ---
            let totalWeight = 0;
            let wornWeight = 0;
            let consumableWeight = 0;

            // Ensure defaults
            walk.items = walk.items || [];

            walk.items.forEach(item => {
                const qty = item.qty || 1;
                const lineWeight = (parseFloat(item.weight) || 0) * qty;
                totalWeight += lineWeight;
                if (item.isWorn) wornWeight += lineWeight;
                if (item.isConsumable) consumableWeight += lineWeight;
            });

            const baseWeight = totalWeight - wornWeight - consumableWeight;

            // Grouping
            const itemsByCat = {};
            store.categories.forEach(cat => itemsByCat[cat.id] = { ...cat, items: [], total: 0 });

            walk.items.forEach(item => {
                if (item.categoryId && itemsByCat[item.categoryId]) {
                    const catId = item.categoryId;
                    const lineWeight = (parseFloat(item.weight) || 0) * (item.qty || 1);
                    itemsByCat[catId].items.push(item);
                    itemsByCat[catId].total += lineWeight;
                }
            });

            // Unit Toggle Logic (Local preferrence for now, could be in store.settings)
            // We'll use a data attribute on the parent or store settings if available.
            // Let's assume store.settings.weightUnit exists (initiated in state.js default)
            const currentUnit = store.settings?.weightUnit || 'g';

            const toggleUnit = () => {
                const newUnit = currentUnit === 'g' ? 'kg' : 'g';
                // We need an action or direct update. settings is a proxy.
                if (store.settings) store.settings.weightUnit = newUnit;
                else store.settings = { weightUnit: newUnit };
            };

            // Local Formatter
            const displayWeight = (w) => window.App.utils.formatWeight(w, currentUnit);

            // Chart Data - Keep 0g for Table, Filter for Chart
            const allSegments = Object.values(itemsByCat).map(c => ({
                label: c.name,
                value: c.total,
                color: c.color
            }));

            const chartSegments = allSegments.filter(c => c.value > 0);

            const chartHtml = renderPieChart(chartSegments, 220, false); // Bigger chart, no legend

            // --- HTML GENERATION ---

            // 1. Categories Table (Main Content)
            let categoriesHtml = '';
            Object.values(itemsByCat).forEach(cat => {
                // Show all categories as requested ("Put all the catagories from the master inventory into each walk")

                categoriesHtml += `
                <div class="category-group" data-cat-id="${cat.id}" style="margin-bottom: 2rem; border-radius:8px; padding:4px; transition: background 0.2s;">
                    <!-- Category Header (Compact) -->
                     <div style="display:flex; align-items:baseline; border-bottom: 1px solid ${cat.color}; margin-bottom:0.5rem; padding-bottom:0.25rem;">
                        <h3 style="margin:0; font-size:1rem; color:${cat.color}; font-weight:bold;">${cat.name}</h3>
                        <div style="margin-left:auto; font-size:0.9rem; font-weight:bold; color:var(--color-text-muted);">${displayWeight(cat.total)}</div>
                     </div>
                    
                    <div>
                        <table class="data-table" style="width:100%; min-width: 800px; table-layout: fixed; border-collapse: separate; border-spacing: 0 1px;">
                             <colgroup>
                                <col style="width: 40px;"> <!-- Flag -->
                                <col style="width: auto;"> <!-- Name (Flexible) -->
                                <col style="width: 60px;"> <!-- Qty -->
                                <col style="width: 80px;"> <!-- Weight -->
                                <col style="width: 65px;"> <!-- Worn -->
                                <col style="width: 65px;"> <!-- Consumable -->
                                <col style="width: 25%;"> <!-- Comment -->
                                <col style="width: 40px;"> <!-- Remove -->
                            </colgroup>
                             <thead style="opacity:0.6; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">
                                <tr>
                                    <th style="padding:8px; text-align:center;"></th>
                                    <th style="padding:8px; text-align:left;">Item</th>
                                    <th style="padding:8px; text-align:center;">Qty</th>
                                    <th style="padding:8px; text-align:right;">Weight</th>
                                    <th style="padding:8px; text-align:center;" title="Worn"></th>
                                    <th style="padding:8px; text-align:center;" title="Consumable"></th>
                                    <th style="padding:8px; text-align:left;">Comment</th>
                                    <th></th>
                                    <th class="print-only" style="width:30px; text-align:center;"></th>
                                </tr>
                            </thead>
                            <tbody>
            `;

                cat.items.forEach(item => {
                    const diffClass = item.isRemoved ? 'diff-removed' : (item.isAdded ? 'diff-added' : '');

                    // SVG Icons
                    const iconShirt = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 2h-2.5C13.5 2 13 2.5 12.5 3c-.5-.5-1-1-1-1H9c-.55 0-1 .45-1 1v1H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9h1c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-3V3c0-.55-.45-1-1-1zm3 7h-1V7h1v2zm-12 0H6V7h1v2z"/></svg>`;
                    const iconFood = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9M16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>`;

                    categoriesHtml += `
                    <tr draggable="true" data-id="${item.id}" class="${diffClass}" style="font-size:0.9rem;">
                        <td style="padding:8px; text-align:center; vertical-align:middle;">
                            <!-- Flag -->
                            <span class="item-flag ${item.flag ? 'active' : ''}" data-id="${item.id}">⚑</span>
                        </td>
                        <td style="padding:8px 0; vertical-align:middle;">
                            <!-- Textarea for wrapping -->
                            <textarea class="edit-field name-edit" rows="1" readonly
                                style="width:100%; padding:0 4px; background:transparent; border:none; color:var(--color-text-primary); font-family:inherit; cursor:grab; resize:none; overflow:hidden; min-height:1.2em; line-height:1.4;"
                                oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${item.name}</textarea>
                        </td>
                        <td style="padding:8px 0; vertical-align:middle;">
                             <input type="number" class="qty-input" data-id="${item.id}" value="${item.qty || 1}" min="1" 
                                style="width:100%; padding:0; text-align:center; background:transparent; border:none; color:var(--color-accent); font-weight:bold;">
                        </td>
                        <td style="padding:8px; text-align:right; font-family:monospace; color:var(--color-text-muted); vertical-align:middle;">
                            ${displayWeight(item.weight * (item.qty || 1))}
                        </td>
                         <td style="padding:8px 0; text-align:center; vertical-align:top;">
                            <button type="button" class="btn-icon-toggle btn-worn ${item.isWorn ? 'active' : ''}" data-id="${item.id}" title="Worn">
                                ${iconShirt}
                            </button>
                        </td>
                        <td style="padding:8px 0; text-align:center; vertical-align:top;">
                            <button type="button" class="btn-icon-toggle btn-consumable ${item.isConsumable ? 'active' : ''}" data-id="${item.id}" title="Consumable">
                                ${iconFood}
                            </button>
                        </td>
                        <td style="padding:8px 0; vertical-align:top;">
                            <input type="text" class="item-comment" data-id="${item.id}" value="${item.comment || ''}" placeholder="Note..."
                                style="width:100%; padding:0; background:transparent; border:none; border-bottom:1px solid transparent; color:var(--color-text-secondary); height:100%;">
                        </td>
                        <td style="padding:8px 0; text-align:center; vertical-align:top;">
                            <button class="btn btn-ghost remove-item-btn" data-id="${item.id}" style="padding:0; color:var(--color-text-muted); opacity:0.5; font-size:1.1rem; line-height:1;">&times;</button>
                        </td>
                        <td class="print-only" style="border:1px solid #ccc; width:30px;"></td>
                    </tr>
                `;
                });

                // Add Row (Mini)
                categoriesHtml += `
                    <tr class="add-item-row" style="opacity:0.9;">
                        <td colspan="8" style="padding:4px 0;">
                             <div style="display:flex; align-items:center;">
                                <span style="color:var(--color-success); margin-right:6px;">+</span>
                                <input type="text" class="new-walk-item-name" data-cat-id="${cat.id}" list="datalist-items" placeholder="Add new item" 
                                    style="flex:1; background:transparent; border:none; color:var(--color-text-secondary); font-size:0.9rem;  font-weight:500;">
                                    
                                <input type="number" class="new-walk-item-qty" data-cat-id="${cat.id}" placeholder="1" 
                                    style="width:40px; text-align:center; background:transparent; border:none; color:var(--color-text-secondary); margin-left:4px;">
                                    
                                <input type="number" class="new-walk-item-weight" data-cat-id="${cat.id}" placeholder="0 g" 
                                    style="width:60px; text-align:right; background:transparent; border:none; color:var(--color-text-secondary); margin-left:4px;">
                             </div>
                        </td>
                    </tr>
                </tbody>
            </table>
            </div>
            </div>
            `;
            });

            // 2. Sidebar Lists (Walks)
            const walksListSelect = `
            <div style="margin-bottom:2rem;">
                <h4 style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.75rem; letter-spacing:1px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>Lists</span>
                     <div style="display:flex; gap:0;">
                        <button id="walk-undo-btn" class="btn btn-ghost" style="padding:2px 6px; font-size:0.9rem; opacity:0.7;" title="Undo">↩️</button>
                        <button id="walk-redo-btn" class="btn btn-ghost" style="padding:2px 6px; font-size:0.9rem; opacity:0.7;" title="Redo">↪️</button>
                     </div>
                </h4>
                
                <div style="display:flex; flex-direction:column; gap:2px;">
                    ${store.walks.map(w => `
                        <div class="walk-nav-item ${w.id === walkId ? 'active-walk' : ''}" data-id="${w.id}" 
                             style="padding:6px 8px; cursor:pointer; border-radius:4px; background:${w.id === walkId ? 'var(--color-bg-hover)' : 'transparent'}; color:${w.id === walkId ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px;">${w.name}</span>
                            <div style="display:flex; gap:2px; opacity:0.7;">
                                <button class="duplicate-walk-btn" data-id="${w.id}" title="Duplicate List" style="background:transparent; border:none; color:var(--color-text-muted); cursor:pointer; padding:0 4px; font-size:1rem; line-height:1;">❐</button>
                                <button class="delete-walk-btn" data-id="${w.id}" title="Delete List" style="background:transparent; border:none; color:var(--color-text-muted); cursor:pointer; padding:0 4px; font-size:1.1rem; line-height:1;">&times;</button>
                            </div>
                        </div>
                    `).join('')}
                    <button id="sidebar-add-walk" style="text-align:left; background:transparent; border:none; color:var(--color-success); padding:6px 8px; font-size:0.85rem; cursor:pointer; margin-top:4px;">+ Add new list</button>
                </div>
            </div>
            <style>
                .walk-nav-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                .draggable-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                .delete-walk-btn:hover { color: var(--color-danger) !important; opacity: 1 !important; transform: scale(1.1); }
            </style>
        `;

            // 3. Sidebar Gear (Inventory) - Categorized
            // Group Items for Sidebar
            const sidebarItemsByCat = {};
            store.categories.forEach(cat => sidebarItemsByCat[cat.id] = { ...cat, items: [] });
            const sidebarUncategorized = { id: 'uncategorized', name: 'Uncategorized', color: '#999', items: [] };

            store.inventory.forEach(item => {
                if (item.categoryId && sidebarItemsByCat[item.categoryId]) {
                    sidebarItemsByCat[item.categoryId].items.push(item);
                } else {
                    sidebarUncategorized.items.push(item);
                }
            });
            if (sidebarUncategorized.items.length > 0) sidebarItemsByCat['uncategorized'] = sidebarUncategorized;

            const gearListHtml = `
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <h4 style="color:var(--color-text-muted); text-transform:uppercase; font-size:0.75rem; letter-spacing:1px; margin-bottom:0.5rem;">Gear</h4>
                <input type="text" id="inv-search" placeholder="Search items..." 
                    style="width:100%; padding:6px; background:rgba(0,0,0,0.1); border:1px solid var(--color-border); border-radius:4px; margin-bottom:0.5rem; color:var(--color-text-primary); font-size:0.85rem;">
                
                <div id="sidebar-gear-list" class="draggable-list" style="flex:1; overflow-y:auto; padding-right:4px;">
                    ${Object.values(sidebarItemsByCat).map(cat => `
                        <div class="sidebar-category-group" style="margin-bottom:1rem;">
                            <div class="sidebar-cat-header" style="color:${cat.color}; font-size:0.8rem; font-weight:bold; margin-bottom:2px; padding-bottom:1px; border-bottom:1px solid rgba(255,255,255,0.1);">${cat.name}</div>
                            ${cat.items.map(item => `
                                <div class="draggable-item" draggable="true" data-id="${item.id}" 
                                     style="padding:4px 8px; margin-bottom:1px; cursor:grab; font-size:0.85rem; display:flex; justify-content:space-between; color:var(--color-text-muted); border-radius:2px;">
                                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px;">${item.name}</span>
                                    <span style="font-family:monospace; opacity:0.7;">${item.weight}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

            // --- PRESERVE STATE BEFORE RENDER ---
            const scrollContainer = parentElement.querySelector('#walk-main-scroll');
            const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

            // Capture active element details to restore focus
            let activeElState = null;
            if (document.activeElement && parentElement.contains(document.activeElement)) {
                const el = document.activeElement;
                activeElState = {
                    id: el.dataset.id,
                    catId: el.dataset.catId,
                    class: Array.from(el.classList).find(c => ['qty-input', 'toggle-worn', 'toggle-consumable', 'new-walk-item-name', 'new-walk-item-qty', 'new-walk-item-weight'].includes(c)),
                    tag: el.tagName,
                    selectionStart: el.selectionStart,
                    selectionEnd: el.selectionEnd
                };
            }

            // --- FINAL LAYOUT RENDER ---
            parentElement.innerHTML = `
            <div style="display:flex; height: 100%; overflow:hidden;">
                <!-- LEFT SIDEBAR -->
                <div class="walks-sidebar" style="width:260px; background:var(--color-bg-sidebar); display:flex; flex-direction:column; padding:1rem; border-right:1px solid var(--color-border); flex-shrink:0;">
                    ${walksListSelect}
                    ${gearListHtml}
                </div>

                <!-- MAIN CONTENT (Scrollable) -->
                <div id="walk-main-scroll" style="flex:1; overflow-y:auto; overflow-x:auto; padding:2rem; background:var(--color-bg);">
                    <!-- Header -->
                    <!-- Header with Photo -->
                    <!-- Header with Photo -->
                    <!-- Header with Photo -->
                    <div class="walk-header-section" style="margin-bottom:2rem; display:flex; flex-wrap:wrap; gap:2rem; align-items:flex-start; justify-content:space-between;">
                        <!-- Left: Title & Description -->
                        <div style="flex:1 1 350px; min-width:300px;">
                             <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                                <!-- Editable Title -->
                                <input type="text" id="walk-name-edit" value="${walk.name}" 
                                    style="font-size:1.8rem; font-weight:bold; background:transparent; border:none; border-bottom:1px solid transparent; color:var(--color-text-primary); width:100%; transition: border-color 0.2s;">
                            </div>
                            
                            <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; width:100%;">
                                <button id="action-csv" class="btn btn-ghost" style="flex:1 1 auto; white-space:nowrap; justify-content:center; font-size:0.85rem; padding:4px 8px; border:1px solid var(--color-border); border-radius:4px;">
                                    Download .csv
                                </button>
                                <button id="action-share" class="btn btn-ghost" style="flex:1 1 auto; white-space:nowrap; justify-content:center; font-size:0.85rem; padding:4px 8px; border:1px solid var(--color-border); border-radius:4px; color:var(--color-primary);">
                                    Share Link 🔗
                                </button>
                                <button id="action-print" class="btn btn-ghost" style="flex:1 1 auto; white-space:nowrap; justify-content:center; font-size:0.85rem; padding:4px 8px; border:1px solid var(--color-border); border-radius:4px;">
                                    PDF Ticklist 📄
                                </button>
                            </div>

                            <div style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
                                 <!-- Description -->
                                 <textarea id="walk-desc-edit" placeholder="Add a description for this trip..." rows="3"
                                    style="width:100%; background:rgba(255,255,255,0.05); border:1px solid transparent; color:var(--color-text-muted); padding:0.5rem; border-radius:4px; resize:vertical; font-family:inherit; font-size:0.9rem;">${walk.description || ''}</textarea>
                            </div>
                        </div>

                        <!-- Right: Photo -->
                        <div style="position:relative; width:200px; padding-top:150px; background:rgba(255,255,255,0.05); border-radius:8px; overflow:hidden; border:1px dashed var(--color-border); cursor:pointer; flex-shrink:0;" id="walk-photo-container">
                            ${walk.photoUrl ?
                    `<img src="${walk.photoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">` :
                    `<div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); flexDirection:column;">
                                    <span style="font-size:2rem;">📷</span>
                                    <span style="font-size:0.8rem;">Add Photo</span>
                                 </div>`
                }
                            <input type="file" id="walk-photo-input" accept="image/*" style="display:none;">
                         </div>
                    </div>


                     <!-- Summary Row (Chart + Stats) -->
                      <div class="walk-summary-section" style="display:flex; flex-wrap:wrap; gap:1.5rem; margin-bottom:2rem; background:rgba(255,255,255,0.02); border:1px solid var(--color-border); border-radius:8px; padding:1rem; align-items:center;">
                         
                         <!-- Col 1: Pie Chart (Compact) -->
                         <div style="flex:0 0 140px; display:flex; justify-content:center; align-items:center;">
                             <div style="position:relative; transform: scale(0.9);">
                                 ${chartHtml}
                             </div>
                         </div>

                         <!-- Col 2: Category Breakdown (Grid) -->
                         <div style="flex:1; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; border-right:1px solid var(--color-border); padding-right:1rem; align-content:center;">
                             ${allSegments.map(s => {
                    const percent = totalWeight > 0 ? Math.round((s.value / totalWeight) * 100) : 0;
                    return `
                                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; padding:2px 0;">
                                    <div style="width:6px; height:6px; border-radius:50%; background:${s.color}; flex-shrink:0;"></div>
                                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; color:var(--color-text-secondary);">${s.label}</span>
                                    <div style="display:flex; gap:4px; align-items:baseline;">
                                        <span style="font-size:0.75em; opacity:0.6;">${percent}%</span>
                                        <span style="font-family:monospace; color:var(--color-text-muted); opacity:0.9; font-size:0.75rem;">${displayWeight(s.value)}</span>
                                    </div>
                                </div>
                             `}).join('')}
                         </div>

                         <!-- Col 3: Key Stats (2-Column Grid) -->
                         <div style="flex:1; min-width: 250px; display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; align-items:center;">
                             
                             <!-- Left: Base Weight -->
                             <div style="display:flex; flex-direction:column;">
                                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                                    <span style="text-transform:uppercase; font-size:0.7rem; color:var(--color-text-muted); letter-spacing:1px;">Base Weight</span>
                                    <button id="unit-toggle-btn" class="btn btn-ghost" style="padding:1px 4px; font-size:0.65rem; border:1px solid var(--color-border); border-radius:4px; opacity:0.5;">${currentUnit.toUpperCase()}</button>
                                 </div>
                                 <div style="font-size:2.2rem; font-weight:bold; line-height:1; color:var(--color-text-primary);">
                                     ${displayWeight(baseWeight).replace(' g', '').replace(' kg', '')} <span style="font-size:1rem; color:var(--color-text-muted); font-weight:normal;">${currentUnit}</span>
                                 </div>
                             </div>

                             <!-- Right: Breakdown -->
                             <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem; border-left:1px solid var(--color-border); padding-left:1rem; color:var(--color-text-muted);">
                                 <div style="display:flex; justify-content:space-between;">
                                     <span>Total</span>
                                     <span style="font-family:monospace; color:var(--color-text-primary);">${displayWeight(totalWeight)}</span>
                                 </div>
                                 <div style="display:flex; justify-content:space-between;">
                                     <span>Consum.</span>
                                     <span style="font-family:monospace;">-${displayWeight(consumableWeight)}</span>
                                 </div>
                                 <div style="display:flex; justify-content:space-between;">
                                     <span>Worn</span>
                                     <span style="font-family:monospace;">-${displayWeight(wornWeight)}</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                    <!-- Categories List -->
                    <div id="drop-zone" style="padding-bottom:100px;">
                        
                        <!-- Shared Datalist -->
                        <datalist id="datalist-items">
                            ${store.inventory.map(i => `<option value="${i.name}"></option>`).join('')}
                        </datalist>

                        ${categoriesHtml}
                    </div>

                </div>
                 
                 <!-- Global Tooltip (Fixed) -->
                 <div id="pie-tooltip" style="position:fixed; top:0; left:0; background:rgba(0,0,0,0.9); color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; pointer-events:none; display:none; white-space:nowrap; z-index:99999; border:1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
            </div>
            
            <style>
                /* Sidebar Hover Effects */
                /* Sidebar Hover Effects */
                .walk-nav-item:hover { background: var(--color-bg-hover); }
                .draggable-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                .walk-nav-item:hover .delete-walk-btn, .walk-nav-item:hover .duplicate-walk-btn { display: block; }
                .delete-walk-btn:hover { color: var(--color-danger) !important; opacity: 1 !important; transform: scale(1.1); }
                .duplicate-walk-btn:hover { color: var(--color-primary) !important; opacity: 1 !important; transform: scale(1.1); }          </style>
        `;



            // Restore Focus
            if (activeElState) {
                let selector = '';
                if (activeElState.class) {
                    selector = `.${activeElState.class}`;
                    if (activeElState.id) selector += `[data-id="${activeElState.id}"]`;
                    if (activeElState.catId) selector += `[data-cat-id="${activeElState.catId}"]`;
                } else if (activeElState.id) {
                    selector = `[data-id="${activeElState.id}"]`; // generic fallback
                }

                if (selector) {
                    const elToFocus = parentElement.querySelector(selector);
                    if (elToFocus) {
                        elToFocus.focus();
                        if ((elToFocus.tagName === 'INPUT' || elToFocus.tagName === 'TEXTAREA') && activeElState.selectionStart != null) {
                            try {
                                elToFocus.setSelectionRange(activeElState.selectionStart, activeElState.selectionEnd);
                            } catch (e) {/* ignore */ }
                        }
                    }
                }
            }


            // --- EVENT ATTACHMENT ---

            // Unit Toggle
            const unitBtn = parentElement.querySelector('#unit-toggle-btn');
            if (unitBtn) {
                unitBtn.addEventListener('click', () => {
                    toggleUnit();
                    // Force re-render
                    window.App.components.renderWalks(parentElement, store);
                });
            }

            // Flag Click
            parentElement.querySelectorAll('.item-flag').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault(); // prevent drag
                    e.stopPropagation();

                    const id = e.target.dataset.id;
                    const item = walk.items.find(i => i.id === id);
                    if (item) {
                        const newItems = walk.items.map(i => i.id === id ? { ...i, flag: !i.flag } : i);
                        actions.updateWalk(walkId, { items: newItems });
                    }
                });
            });

            // Comment Change
            parentElement.querySelectorAll('.item-comment').forEach(input => {
                input.addEventListener('change', (e) => {
                    const id = e.target.dataset.id;
                    const newItems = walk.items.map(i => i.id === id ? { ...i, comment: e.target.value } : i);
                    actions.updateWalk(walkId, { items: newItems });
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') e.target.blur();
                });
            });

            // 1. Sidebar Nav
            parentElement.querySelectorAll('.walk-nav-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-walk-btn')) return; // Ignore delete click
                    store.activeWalkId = el.dataset.id;
                    window.App.components.renderWalks(parentElement, store);
                });
            });

            // Delete Walk
            parentElement.querySelectorAll('.delete-walk-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm('Delete this list?')) {
                        const id = e.target.closest('button').dataset.id;
                        actions.removeWalk(id);
                        if (store.activeWalkId === id) store.activeWalkId = null;
                        window.App.components.renderWalks(parentElement, store);
                    }
                });
            });

            // Undo/Redo
            parentElement.querySelector('#walk-undo-btn').addEventListener('click', () => actions.performUndo());
            parentElement.querySelector('#walk-redo-btn').addEventListener('click', () => actions.performRedo());

            parentElement.querySelector('#sidebar-add-walk').addEventListener('click', () => {
                const name = prompt("New List Name:");
                if (name) {
                    const newWalk = { id: window.App.utils.generateId(), name, date: new Date().toISOString(), items: [], days: 1 };
                    actions.addWalk(newWalk); // Use Action
                    store.activeWalkId = newWalk.id;
                    window.App.components.renderWalks(parentElement, store);
                }
            });

            // 2. Drag & Drop
            const dropZone = parentElement.querySelector('#drop-zone');
            // Source Items
            parentElement.querySelectorAll('.draggable-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.dataset.id);
                    item.style.opacity = '0.5';
                });
                item.addEventListener('dragend', () => item.style.opacity = '1');
            });

            // Internal Sort (Simple Reorder - Not Implemented fully yet, just drag from sidebar)
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                // visual feedback could go here
                const catGroup = e.target.closest('.category-group');
                if (catGroup) {
                    catGroup.style.background = 'rgba(255,255,255,0.02)';
                }
            });
            dropZone.addEventListener('dragleave', (e) => {
                const catGroup = e.target.closest('.category-group');
                if (catGroup) {
                    catGroup.style.background = 'transparent';
                }
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                // Clear styles
                parentElement.querySelectorAll('.category-group').forEach(el => el.style.background = 'transparent');

                const invId = e.dataTransfer.getData('text/plain');
                if (invId) {
                    const invItem = store.inventory.find(i => i.id === invId);
                    if (invItem) {
                        // Determine target category
                        const targetGroup = e.target.closest('.category-group');
                        let targetCatId = invItem.categoryId; // Default to original

                        if (targetGroup && targetGroup.dataset.catId) {
                            targetCatId = targetGroup.dataset.catId;
                        }

                        const clone = { ...invItem, id: window.App.utils.generateId(), originalId: invItem.id, qty: 1, categoryId: targetCatId };

                        // Use Action
                        const newItems = [...walk.items, clone];
                        actions.updateWalk(walkId, { items: newItems });
                    }
                }
            });

            // Duplicate Walk (Sidebar)
            parentElement.querySelectorAll('.duplicate-walk-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetId = e.target.closest('button').dataset.id;
                    const targetWalk = store.walks.find(w => w.id === targetId);

                    if (targetWalk) {
                        const newId = window.App.utils.generateId();
                        const newItems = targetWalk.items.map(item => ({ ...item, id: window.App.utils.generateId() }));
                        const newWalk = {
                            ...targetWalk,
                            id: newId,
                            name: `Copy of ${targetWalk.name}`,
                            items: newItems,
                            date: new Date().toISOString()
                        };

                        actions.addWalk(newWalk);
                        store.activeWalkId = newId;
                        window.App.components.renderWalks(parentElement, store);
                    }
                });
            });

            // Title Edit
            const titleInput = parentElement.querySelector('#walk-name-edit');
            if (titleInput) {
                titleInput.addEventListener('focus', (e) => e.target.style.borderBottomColor = 'var(--color-primary)');
                titleInput.addEventListener('blur', (e) => {
                    e.target.style.borderBottomColor = 'transparent';
                    // Also commit on blur just in case change didn't fire (sometimes redundant but safe)
                    // Actually 'change' fires on blur if changed.
                });

                // ONLY use 'change' (Enter or Blur) to trigger updates. 
                // 'input' fires on every keystroke and triggers re-render, killing focus.
                titleInput.addEventListener('change', (e) => {
                    actions.updateWalk(walkId, { name: e.target.value });
                });

                titleInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        titleInput.blur(); // Trigger change
                    }
                });
            }

            // Description Edit
            const descInput = parentElement.querySelector('#walk-desc-edit');
            if (descInput) {
                descInput.addEventListener('change', (e) => {
                    actions.updateWalk(walkId, { description: e.target.value });
                });
            }

            // Photo Upload
            const photoContainer = parentElement.querySelector('#walk-photo-container');
            const photoInput = parentElement.querySelector('#walk-photo-input');
            if (photoContainer && photoInput) {
                photoContainer.addEventListener('click', () => photoInput.click());
                photoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            actions.updateWalk(walkId, { photoUrl: evt.target.result });
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            // Export Actions
            const btnCsv = parentElement.querySelector('#action-csv');
            const btnShare = parentElement.querySelector('#action-share');

            if (btnCsv) {
                btnCsv.addEventListener('click', () => {
                    const { exportToCsv } = window.App.utils;
                    const rows = [
                        ['Category', 'Item Name', 'Qty', 'Weight (' + currentUnit + ')', 'Worn', 'Consumable']
                    ];

                    // Re-calculate categorized structure for export
                    Object.values(itemsByCat).forEach(cat => {
                        cat.items.forEach(i => {
                            rows.push([
                                cat.name,
                                i.name,
                                i.qty || 1,
                                i.weight,
                                i.isWorn ? 'Yes' : 'No',
                                i.isConsumable ? 'Yes' : 'No'
                            ]);
                        });
                    });

                    // Add Summary
                    rows.push([]);
                    rows.push(['Total Weight', displayWeight(totalWeight)]);
                    rows.push(['Base Weight', displayWeight(baseWeight)]);

                    exportToCsv(walk.name + '.csv', rows);
                });
            }

            if (btnShare) {
                btnShare.addEventListener('click', () => {
                    const { encodeWalkData } = window.App.utils;
                    const encoded = encodeWalkData(walk);
                    if (encoded) {
                        const url = window.location.origin + window.location.pathname + '?import=' + encoded;

                        navigator.clipboard.writeText(url).then(() => {
                            const originalText = btnShare.textContent;
                            btnShare.textContent = 'Copied! ✅';
                            setTimeout(() => btnShare.textContent = originalText, 2000);
                        }).catch(err => {
                            console.error('Failed to copy', err);
                            alert('Could not auto-copy. URL: ' + url);
                        });
                    }
                });
            }

            const btnPrint = parentElement.querySelector('#action-print');
            if (btnPrint) {
                btnPrint.addEventListener('click', () => window.print());
            }



            // 3. Inputs & Updates (Days, Qty, Checks)
            const updateItem = (itemId, itemUpdates) => {
                const idx = walk.items.findIndex(i => i.id === itemId);
                if (idx > -1) {
                    const newItems = [...walk.items];
                    newItems[idx] = { ...newItems[idx], ...itemUpdates };
                    actions.updateWalk(walkId, { items: newItems }); // Use Action
                }
            };



            // (Duration removed by user request)

            parentElement.querySelectorAll('.qty-input').forEach(input => {
                input.addEventListener('change', (e) => updateItem(e.target.dataset.id, { qty: parseFloat(e.target.value) || 1 }));
            });

            parentElement.querySelectorAll('.toggle-worn').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    // If checking worn, uncheck consumable
                    const updates = { isWorn: e.target.checked };
                    if (e.target.checked) updates.isConsumable = false;
                    updateItem(e.target.dataset.id, updates);
                });
            });

            parentElement.querySelectorAll('.toggle-consumable').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    // If checking consumable, uncheck worn
                    const updates = { isConsumable: e.target.checked };
                    if (e.target.checked) updates.isWorn = false;
                    updateItem(e.target.dataset.id, updates);
                });
            });

            parentElement.querySelectorAll('.remove-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => removeItem(e.target.dataset.id));
            });

            // 4. Quick Add (Inline)
            const handleQuickAdd = (catId, nameInput, qtyInput, weightInput) => {
                const name = nameInput.value.trim();
                if (!name) return;

                // Strict Mode: Check Master Inventory
                const masterItem = store.inventory.find(i => i.name.toLowerCase() === name.toLowerCase());

                if (!masterItem) {
                    alert(`"${name}" is not in your Master Inventory.\nPlease create it in the Gear tab first.`);
                    return;
                }

                const qty = parseFloat(qtyInput.value) || 1;
                const weight = parseFloat(weightInput.value) || 0;
                const newItem = {
                    id: window.App.utils.generateId(),
                    originalId: masterItem ? masterItem.id : null, // Link to master item if found
                    name,
                    qty,
                    weight: masterItem ? masterItem.weight : weight, // Use master item weight if available
                    categoryId: catId,
                    isWorn: false,
                    isConsumable: false,
                    isAdded: document.body.classList.contains('mode-shared') // Mark added if in shared mode
                };

                const newItems = [...walk.items, newItem];
                actions.updateWalk(walkId, { items: newItems });

                // Clear inputs and keep focus
                nameInput.value = '';
                qtyInput.value = ''; // placeholder handles 1
                weightInput.value = '';
                nameInput.focus();
            };

            const removeItem = (itemId) => {
                const isSharedMode = document.body.classList.contains('mode-shared');
                const targetItem = walk.items.find(i => i.id === itemId);

                if (isSharedMode && targetItem && !targetItem.isAdded) {
                    // Soft Delete (Tracked Change)
                    // Toggle removal state? Or just remove? 
                    // "Function for when shared back" implies we want to see what they removed.
                    // If it's already removed, maybe un-remove (toggle)?
                    const newItems = walk.items.map(i => i.id === itemId ? { ...i, isRemoved: !i.isRemoved } : i);
                    actions.updateWalk(walkId, { items: newItems });
                } else {
                    // Hard Delete (Normal mode OR it was a newly added item)
                    const newItems = walk.items.filter(i => i.id !== itemId);
                    actions.updateWalk(walkId, { items: newItems });
                }
            };

            // (Duration removed by user request)

            parentElement.querySelectorAll('.qty-input').forEach(input => {
                input.addEventListener('change', (e) => updateItem(e.target.dataset.id, { qty: parseFloat(e.target.value) || 1 }));
            });

            parentElement.querySelectorAll('.btn-worn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('button').dataset.id;
                    const item = walk.items.find(i => i.id === id);
                    if (item) {
                        // Toggle worn, if becoming true -> uncheck consumable
                        const isWorn = !item.isWorn;
                        const updates = { isWorn };
                        if (isWorn) updates.isConsumable = false;
                        updateItem(id, updates);
                    }
                });
            });

            parentElement.querySelectorAll('.btn-consumable').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('button').dataset.id;
                    const item = walk.items.find(i => i.id === id);
                    if (item) {
                        // Toggle consumable, if becoming true -> uncheck worn
                        const isConsumable = !item.isConsumable;
                        const updates = { isConsumable };
                        if (isConsumable) updates.isWorn = false;
                        updateItem(id, updates);
                    }
                });
            });

            parentElement.querySelectorAll('.remove-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => removeItem(e.target.dataset.id));
            });

            // 6. Inline Predictive Autocomplete
            parentElement.querySelectorAll('.new-walk-item-name').forEach(input => {
                input.addEventListener('input', (e) => {
                    const val = e.target.value.toLowerCase();
                    // Find matching item in master inventory
                    const match = store.inventory.find(i => i.name.toLowerCase() === val);
                    if (match) {
                        const catId = e.target.dataset.catId;
                        const weightInput = parentElement.querySelector(`.new-walk-item-weight[data-cat-id="${catId}"]`);
                        if (weightInput) {
                            weightInput.value = match.weight;
                        }
                    }
                });
            });

            const attachEnter = (input) => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const catId = e.target.dataset.catId;
                        const name = parentElement.querySelector(`.new-walk-item-name[data-cat-id="${catId}"]`);
                        const qty = parentElement.querySelector(`.new-walk-item-qty[data-cat-id="${catId}"]`);
                        const weight = parentElement.querySelector(`.new-walk-item-weight[data-cat-id="${catId}"]`);
                        handleQuickAdd(catId, name, qty, weight);
                    }
                });
            };

            parentElement.querySelectorAll('.new-walk-item-name, .new-walk-item-qty, .new-walk-item-weight').forEach(attachEnter);

            // 5. Search Logic (Sidebar)
            parentElement.querySelector('#inv-search').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();

                parentElement.querySelectorAll('.sidebar-category-group').forEach(group => {
                    let hasVisibleItems = false;
                    group.querySelectorAll('.draggable-item').forEach(el => {
                        const text = el.innerText.toLowerCase();
                        const isVisible = text.includes(term);
                        el.style.display = isVisible ? 'flex' : 'none';
                        if (isVisible) hasVisibleItems = true;
                    });

                    // Toggle Category Header visibility
                    group.style.display = hasVisibleItems ? 'block' : 'none';
                });
            });

            // 6. Pie Chart Tooltips (Restored & Robust)
            const tooltip = parentElement.querySelector('#pie-tooltip');
            // Ensure tooltip is fixed so it breaks out of any overflow/scaling context
            tooltip.style.position = 'fixed';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.zIndex = '10000';
            tooltip.style.transform = 'none'; // Reset any transform
            tooltip.style.marginTop = '0';

            parentElement.querySelectorAll('.pie-segment').forEach(seg => {
                seg.addEventListener('mouseenter', (e) => {
                    const label = e.target.getAttribute('data-cat');
                    const weight = e.target.getAttribute('data-weight');

                    tooltip.style.display = 'block';
                    tooltip.textContent = `${label}: ${weight}`;

                    // Initial Pos
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                });
                seg.addEventListener('mousemove', (e) => {
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                });
                seg.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
            });
            // Initial resize for textareas
            parentElement.querySelectorAll('textarea.name-edit').forEach(el => {
                el.style.height = el.scrollHeight + 'px';
            });

            // Restore Scroll & Attach Listener (Robust Global State)
            const newScrollContainer = parentElement.querySelector('#walk-main-scroll');
            if (newScrollContainer) {
                window.App = window.App || {};
                window.App.walkScrolls = window.App.walkScrolls || {};

                if (window.App.walkScrolls[walkId] > 0) {
                    newScrollContainer.scrollTop = window.App.walkScrolls[walkId];
                }


                newScrollContainer.addEventListener('scroll', (e) => {
                    window.App.walkScrolls[walkId] = e.target.scrollTop;
                });
            }

            // Restore Sidebar Scroll
            const sidebarScrollContainer = parentElement.querySelector('#sidebar-gear-list');
            if (sidebarScrollContainer) {
                window.App = window.App || {};
                window.App.sidebarScroll = window.App.sidebarScroll || 0;

                if (window.App.sidebarScroll > 0) {
                    sidebarScrollContainer.scrollTop = window.App.sidebarScroll;
                }

                sidebarScrollContainer.addEventListener('scroll', (e) => {
                    window.App.sidebarScroll = e.target.scrollTop;
                });
            }
        } catch (e) {
            console.error("Render walk detail failed:", e);
            parentElement.innerHTML = `<div style="padding:2rem; color:var(--color-danger);">Error displaying walk: ${e.message}</div>`;
        }
    }
};
