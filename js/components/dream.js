
window.App = window.App || {};
window.App.components = window.App.components || {};

window.App.components.renderDream = (parentElement, store) => {
    const { generateId, formatWeight } = window.App.utils;
    const { actions } = window.App.state;

    if (!store.dreamItems) store.dreamItems = [];

    parentElement.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2>Dream Setup</h2>
            <button id="add-dream-btn" class="btn btn-primary">+ Add Dream Item</button>
        </div>
        
        <div class="card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Dream Item</th>
                        <th style="text-align:right">Weight</th>
                        <th>Compare To (Current)</th>
                        <th style="text-align:right">Savings</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="dream-list-body">
                    ${store.dreamItems.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:var(--color-text-muted);">No dream items yet. what are you saving for?</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;

    const tbody = parentElement.querySelector('#dream-list-body');

    if (store.dreamItems.length > 0) {
        let html = '';
        store.dreamItems.forEach(dItem => {
            const comparedItem = dItem.compareId ? store.inventory.find(i => i.id === dItem.compareId) : null;
            const savings = comparedItem ? (parseFloat(comparedItem.weight) - parseFloat(dItem.weight)) : 0;
            const savingsClass = savings > 0 ? 'color:var(--color-accent)' : (savings < 0 ? 'color:var(--color-danger)' : '');

            html += `
                <tr>
                    <td>
                        <div style="font-weight:600">${dItem.name}</div>
                        <div style="font-size:0.8rem; color:var(--color-text-secondary)">${dItem.notes || ''}</div>
                    </td>
                    <td style="text-align:right; font-family:monospace;">${formatWeight(dItem.weight)}</td>
                    <td>
                        <select class="compare-select" data-id="${dItem.id}" style="background:var(--color-bg-main); color:white; border:1px solid var(--color-border); padding:0.25rem; border-radius:4px; max-width:200px;">
                            <option value="">-- None --</option>
                            ${store.inventory.map(inv => `
                                <option value="${inv.id}" ${dItem.compareId === inv.id ? 'selected' : ''}>${inv.name} (${inv.weight}g)</option>
                            `).join('')}
                        </select>
                    </td>
                    <td style="text-align:right; font-weight:bold; ${savingsClass}">
                        ${comparedItem ? (savings > 0 ? '-' : '+') + formatWeight(Math.abs(savings)) : '-'}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary purchase-btn" data-id="${dItem.id}" title="Mark Purchased">💰 Buy</button>
                        <button class="btn btn-sm btn-ghost delete-dream-btn" data-id="${dItem.id}" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    parentElement.querySelector('#add-dream-btn').addEventListener('click', () => {
        const name = prompt("Dream Item Name:");
        if (name) {
            const weight = parseFloat(prompt("Estimated Weight (g):") || 0);
            const newItem = {
                id: generateId(),
                name,
                weight,
                unit: 'g',
                compareId: null,
                notes: 'Wishlist'
            };
            store.dreamItems = [...store.dreamItems, newItem];
            window.App.components.renderDream(parentElement, store);
        }
    });

    parentElement.querySelectorAll('.compare-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const dId = e.target.dataset.id;
            const val = e.target.value;
            const idx = store.dreamItems.findIndex(i => i.id === dId);
            const newItems = [...store.dreamItems];
            newItems[idx] = { ...newItems[idx], compareId: val };
            store.dreamItems = newItems;
            window.App.components.renderDream(parentElement, store);
        });
    });

    parentElement.querySelectorAll('.delete-dream-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dId = e.target.dataset.id;
            store.dreamItems = store.dreamItems.filter(i => i.id !== dId);
            window.App.components.renderDream(parentElement, store);
        });
    });

    parentElement.querySelectorAll('.purchase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dId = e.target.dataset.id;
            const dItem = store.dreamItems.find(i => i.id === dId);
            if (dItem && confirm(`Mark "${dItem.name}" as purchased? It will move to your Inventory.`)) {
                const invItem = {
                    ...dItem,
                    id: generateId(),
                    categoryId: store.categories[0].id
                };
                delete invItem.compareId;
                actions.addItem(invItem);

                store.dreamItems = store.dreamItems.filter(i => i.id !== dId);
                alert(`Moved ${dItem.name} to Inventory!`);
                window.App.components.renderDream(parentElement, store);
            }
        });
    });
};
