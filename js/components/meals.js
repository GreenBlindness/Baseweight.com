
window.App = window.App || {};
window.App.components = window.App.components || {};

window.App.components.renderMeals = (parentElement, store) => {
    const { generateId, sumWeights } = window.App.utils;
    const { actions } = window.App.state;

    // Helper (if not initialized in state)
    if (!store.recipes) store.recipes = [];

    parentElement.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2>Recipe Book</h2>
            <button id="create-recipe-btn" class="btn btn-primary">+ New Recipe</button>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:2rem;">
            <!-- Recipe List -->
            <div class="card">
                <div id="recipe-list" style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${store.recipes.length === 0 ? '<div style="padding:1rem; color:var(--color-text-muted);">No recipes yet.</div>' : ''}
                    ${store.recipes.map(recipe => `
                        <div class="recipe-item" data-id="${recipe.id}" style="padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer; background:var(--color-bg-main);">
                            <div style="font-weight:600">${recipe.name}</div>
                            <div style="font-size:0.8rem; color:var(--color-text-secondary);">${recipe.ingredients.length} ingredients • ${sumWeights(recipe.ingredients)}g</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recipe Detail / Edit -->
            <div id="recipe-detail" class="card">
                <div style="display:flex; align-items:center; justify-content:center; height:200px; color:var(--color-text-muted);">
                    Select a recipe to edit
                </div>
            </div>
        </div>
    `;

    parentElement.querySelectorAll('.recipe-item').forEach(item => {
        item.addEventListener('click', () => {
            renderRecipeDetail(parentElement.querySelector('#recipe-detail'), store, item.dataset.id);
        });
    });

    parentElement.querySelector('#create-recipe-btn').addEventListener('click', () => {
        const name = prompt("Recipe Name (e.g. Oatmeal Breakfast):");
        if (name) {
            const newRecipe = {
                id: generateId(),
                name,
                ingredients: []
            };
            store.recipes = [...store.recipes, newRecipe];
            window.App.components.renderMeals(parentElement, store);
        }
    });

    function renderRecipeDetail(container, store, recipeId) {
        const recipe = store.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <h3 style="margin:0">${recipe.name}</h3>
                <button class="btn btn-ghost btn-sm text-danger" id="delete-recipe-btn">Delete Recipe</button>
            </div>

            <table class="data-table" style="margin-bottom:1rem;">
                <thead>
                    <tr>
                    <th>Ingredient</th>
                    <th style="text-align:right">Weight (g)</th>
                    <th style="text-align:right">Calories (kc)</th> 
                    <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${recipe.ingredients.map((ing, idx) => `
                        <tr>
                            <td>${ing.name}</td>
                            <td style="text-align:right">${ing.weight}</td>
                            <td style="text-align:right">${ing.calories || '-'}</td>
                            <td><button class="btn btn-ghost btn-sm remove-ing-btn" data-idx="${idx}">×</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="background:var(--color-bg-hover); padding:1rem; border-radius:var(--radius-md);">
                <h4>Add Ingredient</h4>
                <div style="display:flex; gap:0.5rem;">
                    <input type="text" id="new-ing-name" placeholder="Name" style="flex:1; padding:0.5rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-main); color:white;">
                    <input type="number" id="new-ing-weight" placeholder="g" style="width:80px; padding:0.5rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-main); color:white;">
                    <input type="number" id="new-ing-cal" placeholder="kcal" style="width:80px; padding:0.5rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-main); color:white;">
                    <button id="add-ing-btn" class="btn btn-primary">Add</button>
                </div>
            </div>
        `;

        container.querySelector('#add-ing-btn').addEventListener('click', () => {
            const name = container.querySelector('#new-ing-name').value;
            const weight = parseFloat(container.querySelector('#new-ing-weight').value) || 0;
            const calories = parseFloat(container.querySelector('#new-ing-cal').value) || 0;

            if (name) {
                const newIngs = [...recipe.ingredients, { name, weight, calories }];
                const rIndex = store.recipes.findIndex(r => r.id === recipeId);
                const newRecipes = [...store.recipes];
                newRecipes[rIndex] = { ...recipe, ingredients: newIngs };
                store.recipes = newRecipes;

                window.App.components.renderMeals(document.getElementById('main-content'), store);
            }
        });

        container.querySelectorAll('.remove-ing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const newIngs = recipe.ingredients.filter((_, i) => i !== idx);
                const rIndex = store.recipes.findIndex(r => r.id === recipeId);
                const newRecipes = [...store.recipes];
                newRecipes[rIndex] = { ...recipe, ingredients: newIngs };
                store.recipes = newRecipes;
                window.App.components.renderMeals(document.getElementById('main-content'), store);
            });
        });

        container.querySelector('#delete-recipe-btn').addEventListener('click', () => {
            if (confirm('Delete recipe?')) {
                store.recipes = store.recipes.filter(r => r.id !== recipeId);
                window.App.components.renderMeals(document.getElementById('main-content'), store);
            }
        });
    }
};
