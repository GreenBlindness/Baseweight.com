
// Namespace
window.App = window.App || {};

window.App.utils = {
    generateId: () => {
        return crypto.randomUUID();
    },

    formatWeight: (grams, unit = 'g') => {
        if (unit === 'kg') return (grams / 1000).toFixed(2) + ' kg';
        if (unit === 'lb') return (grams * 0.00220462).toFixed(2) + ' lb';
        if (unit === 'oz') return (grams * 0.035274).toFixed(1) + ' oz';
        return grams + ' g';
    },

    sumWeights: (items) => {
        const factors = { 'g': 1, 'kg': 1000, 'lb': 453.592, 'oz': 28.3495 };
        return items.reduce((sum, item) => {
            if (item.isRemoved) return sum; // Tracked Changes: Ignore removed
            const qty = item.qty || 1;
            const w = parseFloat(item.weight) || 0;
            const u = item.unit || 'g';
            const factor = factors[u] || 1;
            return sum + (w * factor * qty);
        }, 0);
    },

    // Simple SVG Pie Chart Generator
    renderPieChart: (segments, size = 200, includeLegend = true) => {
        const total = segments.reduce((sum, s) => sum + s.value, 0);
        if (total === 0) return '<div style="text-align:center; color:#666;">No Data</div>';

        let startAngle = 0;
        const radius = size / 2;
        const cx = radius;
        const cy = radius;

        const paths = segments.map(seg => {
            const angle = (seg.value / total) * 360;
            const endAngle = startAngle + angle;

            // Calculate path coordinates
            const innerRadius = radius * 0.6; // Donut hole size

            // Calculate coordinates
            const x1 = cx + radius * Math.cos(Math.PI * startAngle / 180);
            const y1 = cy + radius * Math.sin(Math.PI * startAngle / 180);
            const x2 = cx + radius * Math.cos(Math.PI * endAngle / 180);
            const y2 = cy + radius * Math.sin(Math.PI * endAngle / 180);

            const x3 = cx + innerRadius * Math.cos(Math.PI * endAngle / 180);
            const y3 = cy + innerRadius * Math.sin(Math.PI * endAngle / 180);
            const x4 = cx + innerRadius * Math.cos(Math.PI * startAngle / 180);
            const y4 = cy + innerRadius * Math.sin(Math.PI * startAngle / 180);

            // SVG Path command (Outer Arc -> Line In -> Inner Arc -> Line Out -> Close)
            const largeArc = angle > 180 ? 1 : 0;

            const pathData = [
                `M ${x1} ${y1}`, // Start Outer
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, // Outer Arc
                `L ${x3} ${y3}`, // Line to Inner
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`, // Inner Arc (sweep=0 for reverse)
                `Z` // Close
            ].join(' ');

            startAngle = endAngle;

            const tooltip = `${seg.label}: ${window.App.utils.formatWeight(seg.value)}`;

            return `<path d="${pathData}" fill="${seg.color}" class="pie-segment"
                        stroke="${window.App.state.store.settings?.darkMode ? '#1e293b' : '#ffffff'}" stroke-width="2"
                        data-cat="${seg.label}" data-weight="${window.App.utils.formatWeight(seg.value)}"
                        style="transition: opacity 0.2s;"
                        onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
                    </path>`;
        }).join('');

        const legendHtml = includeLegend ? `
            <div style="margin-top:1rem; font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                ${segments.map(seg => `
                    <div style="display:flex; align-items:center; gap:0.25rem;">
                        <span style="width:10px; height:10px; background:${seg.color}; display:inline-block; border-radius:2px;"></span>
                        <span>${seg.label}</span>
                    </div>
                `).join('')}
            </div>` : '';

        return `
            <svg width="${size}" height="${size}" viewBox="-1 -1 ${size + 2} ${size + 2}" style="transform: rotate(-90deg); cursor: crosshair;" class="pie-chart-svg">
                ${paths}
            </svg>
            ${legendHtml}
        `;
    },

    confirmAction: (message, onConfirm) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                <h3 style="margin-top:0;">Confirm Action</h3>
                <p style="color:var(--color-text-secondary); margin-bottom:1.5rem;">${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
                    <button class="btn btn-primary" id="confirm-ok" style="background:var(--color-danger); border:none; color:white;">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => document.body.removeChild(overlay);

        overlay.querySelector('#confirm-cancel').addEventListener('click', close);
        overlay.querySelector('#confirm-ok').addEventListener('click', () => {
            onConfirm();
            close();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    },

    exportToCsv: (filename, rows) => {
        const processRow = (row) => {
            return row.map(val => {
                if (val === null || val === undefined) return '';
                let result = val.toString();
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result.replace(/"/g, '""') + '"';
                return result;
            }).join(',');
        };

        const csvFile = rows.map(processRow).join('\n');
        const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    encodeWalkData: (walk) => {
        // Minimalize JSON to save URL space
        // We only need the items and key metadata
        const data = {
            n: walk.name,
            d: walk.description || '',
            i: walk.items.map(i => ({
                n: i.name,
                w: i.weight,
                q: i.qty || 1,
                c: i.categoryId, // Need to handle categories if they don't exist on import?
                o: i.isWorn ? 1 : 0,
                x: i.isConsumable ? 1 : 0,
                f: i.flag ? 1 : 0,    // Flag
                m: i.comment || '',   // Message/Comment
                a: i.isAdded ? 1 : 0, // Added
                r: i.isRemoved ? 1 : 0 // Removed
            }))
        };
        try {
            return btoa(encodeURIComponent(JSON.stringify(data)));
        } catch (e) {
            console.error("Encoding failed", e);
            return null;
        }
    },

    decodeWalkData: (encodedString) => {
        try {
            const json = decodeURIComponent(atob(encodedString));
            const data = JSON.parse(json);

            // Rehydrate
            return {
                id: crypto.randomUUID(), // New ID
                name: data.n,
                description: data.d,
                date: new Date().toISOString(),
                items: (data.i || []).map(i => ({
                    id: crypto.randomUUID(),
                    name: i.n,
                    weight: i.w,
                    qty: i.q,
                    categoryId: i.c || 'uncategorized',
                    isWorn: !!i.o,
                    isConsumable: !!i.x,
                    flag: !!i.f,
                    comment: i.m || '',
                    isAdded: !!i.a,
                    isRemoved: !!i.r
                }))
            };
        } catch (e) {
            console.error("Decoding failed", e);
            return null;
        }
    }
};
