// Global variables
let cropsData = {};
let locationsData = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Only run if the calendar tab elements exist on the page
    if (document.getElementById('selectedCrop')) {
        loadCropsData();
        addCalendarEventListeners();
    }
});

// Load crops data from API
async function loadCropsData() {
    try {
        const response = await fetch('/api/crops');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        cropsData = await response.json();
        
        const locationsResponse = await fetch('/api/locations');
        if (!locationsResponse.ok) throw new Error(`HTTP error! status: ${locationsResponse.status}`);
        locationsData = await locationsResponse.json();
        
        updateVarieties(); // Initial population
        loadOptimalSowing();
    } catch (error) {
        console.error('Error loading initial calendar data:', error);
        alert('Could not load necessary crop data. Please refresh the page.');
    }
}

// Add all event listeners for the calendar tab
function addCalendarEventListeners() {
    document.getElementById('sowingDate').addEventListener('change', toggleGenerateButton);
    document.getElementById('selectedCrop').addEventListener('change', () => {
        updateVarieties();
        loadOptimalSowing();
    });
    document.getElementById('generateBtn').addEventListener('click', generateCalendar);
}

// Update varieties dropdown based on selected crop
function updateVarieties() {
    const cropSelect = document.getElementById('selectedCrop');
    const varietySelect = document.getElementById('variety');
    const selectedCrop = cropSelect.value;
    
    // Clear previous options
    varietySelect.innerHTML = '';

    if (cropsData[selectedCrop] && cropsData[selectedCrop].varieties) {
        Object.entries(cropsData[selectedCrop].varieties).forEach(([key, data]) => {
            const option = new Option(data.name, key);
            varietySelect.add(option);
        });
    }
}

// Toggle generate button based on sowing date
function toggleGenerateButton() {
    document.getElementById('generateBtn').disabled = !document.getElementById('sowingDate').value;
}

// Load optimal sowing recommendations
async function loadOptimalSowing() {
    const selectedCrop = document.getElementById('selectedCrop').value;
    try {
        const response = await fetch(`/api/optimal-sowing/${selectedCrop}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const recommendations = await response.json();
        displayOptimalSowing(recommendations, selectedCrop);
    } catch (error) {
        console.error('Error loading optimal sowing times:', error);
    }
}

// Display optimal sowing recommendations
function displayOptimalSowing(recommendations, cropName) {
    const grid = document.getElementById('recommendationsGrid');
    document.querySelector('#sowingRecommendations h2').innerHTML = `<i class="fas fa-clock"></i> Optimal Sowing Times for ${cropName}`;
    if (!recommendations || recommendations.length === 0) {
        grid.innerHTML = '<p>No recommendations available for this crop.</p>';
        return;
    }
    grid.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card ${rec.isOptimal ? 'optimal' : ''}">
            <h3>${rec.season}</h3>
            <p>${formatDate(rec.startDate)} to ${formatDate(rec.endDate)}</p>
            ${rec.isOptimal ? '<div class="optimal-badge"><i class="fas fa-check-circle"></i> Currently Optimal</div>' : ''}
        </div>`).join('');
}

// Generate calendar timeline
async function generateCalendar() {
    const payload = {
        sowingDate: document.getElementById('sowingDate').value,
        crop: document.getElementById('selectedCrop').value,
        variety: document.getElementById('variety').value,
        location: document.getElementById('location').value,
    };
    
    try {
        const response = await fetch('/api/calculate-timeline', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const timeline = await response.json();
        if (timeline.error) {
            alert('Error from server: ' + timeline.error);
            return;
        }
        displayTimeline(timeline, payload.crop, payload.location);
    } catch (error) {
        console.error('Error generating timeline:', error);
        alert('Failed to generate timeline. Please check console for details.');
    }
}

// *** THIS IS THE MAIN FIX FOR THE CALENDAR DISPLAY ***
function displayTimeline(timeline, crop, location) {
    // Hide the placeholder
    document.getElementById('placeholder').classList.add('hidden');
    
    // Show the result sections
    document.getElementById('summarySection').classList.remove('hidden');
    document.getElementById('timelineSection').classList.remove('hidden');
    document.getElementById('criticalFactorsSection').classList.remove('hidden');
    document.getElementById('managementTipsSection').classList.remove('hidden');

    // Update summary card
    document.getElementById('totalDuration').textContent = `${timeline.totalDuration} days`;
    document.getElementById('expectedHarvest').textContent = formatDate(timeline.expectedHarvest);
    document.getElementById('varietyInfo').textContent = timeline.varietyInfo.name;
    document.getElementById('locationInfo').textContent = location;
    
    displayTimelineStages(timeline.stages);
    displayCriticalFactors(crop);
}

function displayTimelineStages(stages) {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = stages.map(stage => `
        <div class="timeline-item ${stage.isActive ? 'active' : (stage.isPast ? 'past' : 'future')}">
            <div class="timeline-header">
                <div class="timeline-title"><h3>${stage.stage}</h3></div>
                <div><p>${formatDate(stage.startDate)} - ${formatDate(stage.endDate)}</p></div>
            </div>
            <div class="timeline-content">
                <div class="activities"><h4>Activities</h4><ul>${stage.activities.map(act => `<li>${act}</li>`).join('')}</ul></div>
                <div class="weather-info"><h4>Weather</h4><p>Temp: ${stage.weather.temp[0]}-${stage.weather.temp[1]}°C</p><p>Rain: ${stage.weather.rainfall}mm</p>${stage.weatherAlert.map(alert => `<div class="weather-alert ${alert.type}">${alert.message}</div>`).join('')}</div>
            </div>
        </div>`).join('');
}

function displayCriticalFactors(crop) {
    const factors = cropsData[crop].criticalFactors;
    document.getElementById('temperatureFactors').innerHTML = `<p><strong>Optimal:</strong> ${factors.temperature.optimal}</p>`;
    document.getElementById('waterFactors').innerHTML = `<p><strong>Requirement:</strong> ${factors.rainfall.requirement}</p>`;
    document.getElementById('humidityFactors').innerHTML = `<p><strong>Optimal:</strong> ${factors.humidity.optimal}</p>`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}