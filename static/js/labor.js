document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the labor tab by looking for its main form
    const laborForm = document.getElementById('laborForm');
    if (!laborForm) {
        return; // Exit if not on the right tab
    }

    // --- DATA ---
    // Labor days per acre for various crops and activities
    const cropData = {
        Sugarcane: { "Land Preparation": 4, "Planting": 6, "Weeding": 10, "Irrigation": 5, "Harvesting": 20 },
        Jowar: { "Land Preparation": 2, "Sowing": 1, "Weeding": 4, "Harvesting": 5 },
        Cotton: { "Land Preparation": 3, "Sowing": 2, "Weeding": 8, "Picking": 15 },
        Rice: { "Nursery": 5, "Transplanting": 12, "Weeding": 8, "Harvesting": 10 },
        Wheat: { "Land Preparation": 2, "Sowing": 1, "Irrigation": 4, "Harvesting": 6 },
        Groundnut: { "Land Preparation": 3, "Sowing": 4, "Weeding": 6, "Harvesting": 8 },
        Maize: { "Land Preparation": 2, "Sowing": 1, "Weeding": 5, "Harvesting": 5 },
        Tur: { "Land Preparation": 2, "Sowing": 1, "Weeding": 5, "Harvesting": 6 },
        Urad: { "Land Preparation": 1, "Sowing": 1, "Weeding": 3, "Harvesting": 4 },
        Moong: { "Land Preparation": 1, "Sowing": 1, "Weeding": 3, "Harvesting": 4 },
        Gram: { "Land Preparation": 2, "Sowing": 1, "Weeding": 4, "Harvesting": 5 },
        Soybean: { "Land Preparation": 2, "Sowing": 1, "Weeding": 4, "Harvesting": 5 },
        Ginger: { "Land Preparation": 5, "Planting": 8, "Weeding": 12, "Harvesting": 15 },
        Turmeric: { "Land Preparation": 5, "Planting": 8, "Weeding": 12, "Harvesting": 15 },
        Grapes: { "Pruning": 20, "Training": 15, "Irrigation": 10, "Spraying": 10, "Harvesting": 25 },
    };

    // --- DOM ELEMENTS ---
    // IMPORTANT: ID "laborCropSelect" is used to avoid conflict with other tabs.
    const cropSelect = document.getElementById('laborCropSelect');
    const areaInput = document.getElementById('area');
    const areaUnitSelect = document.getElementById('areaUnit');
    const wageRateInput = document.getElementById('wageRate');
    const resultsDiv = document.getElementById('results');
    const emptyStateDiv = document.getElementById('emptyState');
    const totalLaborDaysP = document.getElementById('totalLaborDays');
    const totalCostP = document.getElementById('totalCost');
    const calculationDetailsDiv = document.getElementById('calculationDetails');
    const activityBreakdownDiv = document.getElementById('activityBreakdown');
    const resetBtn = document.getElementById('resetBtn');

    // --- FUNCTIONS ---
    // Populate crop dropdown
    function populateCrops() {
        Object.keys(cropData).forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop;
            cropSelect.appendChild(option);
        });
    }

    // Handle form submission
    function calculateLabor(event) {
        event.preventDefault();

        const selectedCrop = cropSelect.value;
        const area = parseFloat(areaInput.value);
        const areaUnit = areaUnitSelect.value;
        const wageRate = parseFloat(wageRateInput.value);

        if (!selectedCrop || isNaN(area) || isNaN(wageRate) || area <= 0 || wageRate <= 0) {
            alert("Please fill in all fields with valid numbers.");
            return;
        }

        const laborDaysPerAcre = Object.values(cropData[selectedCrop]).reduce((sum, days) => sum + days, 0);
        const conversionFactor = areaUnit === 'hectares' ? 2.47105 : 1;
        const totalAreaInAcres = area * conversionFactor;

        const totalLaborDays = laborDaysPerAcre * totalAreaInAcres;
        const totalCost = totalLaborDays * wageRate;

        displayResults(selectedCrop, totalAreaInAcres, wageRate, totalLaborDays, totalCost);
    }

    // Display results
    function displayResults(crop, areaInAcres, wage, totalDays, totalCost) {
        totalLaborDaysP.textContent = totalDays.toFixed(1);
        totalCostP.textContent = `₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

        calculationDetailsDiv.innerHTML = `
            <p>Based on <strong>${cropData[crop].length}</strong> activities for <strong>${crop}</strong>.</p>
            <p>Total Area: <strong>${areaInAcres.toFixed(2)} acres</strong></p>
            <p>Wage Rate: <strong>₹${wage.toLocaleString('en-IN')}/day</strong></p>
        `;

        activityBreakdownDiv.innerHTML = '';
        const activities = cropData[crop];
        for (const activity in activities) {
            const laborDays = activities[activity] * areaInAcres;
            const activityCost = laborDays * wage;
            const breakdownItem = document.createElement('div');
            breakdownItem.className = 'breakdown-list-item';
            breakdownItem.innerHTML = `
                <span class="activity-name">${activity}</span>
                <span class="activity-cost">₹${activityCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            `;
            activityBreakdownDiv.appendChild(breakdownItem);
        }

        emptyStateDiv.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
    }

    // Reset form and results
    function resetView() {
        laborForm.reset();
        resultsDiv.classList.add('hidden');
        emptyStateDiv.classList.remove('hidden');
    }

    // --- INITIALIZATION ---
    populateCrops();
    laborForm.addEventListener('submit', calculateLabor);
    resetBtn.addEventListener('click', resetView);
});