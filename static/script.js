
// Global variables
let cropsData = {};
let locationsData = {};
let currentTimeline = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadCropsData();
    loadOptimalSowing();
});

// Load crops data from API
async function loadCropsData() {
    try {
        const response = await fetch('/api/crops');
        cropsData = await response.json();
        
        const locationsResponse = await fetch('/api/locations');
        locationsData = await locationsResponse.json();
        
        updateVarieties();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update varieties dropdown based on selected crop
function updateVarieties() {
    const cropSelect = document.getElementById('selectedCrop');
    const varietySelect = document.getElementById('variety');
    const selectedCrop = cropSelect.value;
    
    if (cropsData[selectedCrop]) {
        varietySelect.innerHTML = '';
        const varieties = cropsData[selectedCrop].varieties;
        
        Object.entries(varieties).forEach(([key, data]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.name;
            varietySelect.appendChild(option);
        });
    }
    
    loadOptimalSowing();
}

// Toggle generate button based on sowing date
function toggleGenerateButton() {
    const sowingDate = document.getElementById('sowingDate').value;
    const generateBtn = document.getElementById('generateBtn');
    
    generateBtn.disabled = !sowingDate;
}

// Load optimal sowing recommendations
async function loadOptimalSowing() {
    const selectedCrop = document.getElementById('selectedCrop').value;
    
    try {
        const response = await fetch(`/api/optimal-sowing/${selectedCrop}`);
        const recommendations = await response.json();
        
        displayOptimalSowing(recommendations, selectedCrop);
    } catch (error) {
        console.error('Error loading optimal sowing:', error);
    }
}

// Display optimal sowing recommendations
function displayOptimalSowing(recommendations, cropName) {
    const grid = document.getElementById('recommendationsGrid');
    const title = document.querySelector('#sowingRecommendations h2');
    title.innerHTML = `<i class="fas fa-clock"></i> Optimal Sowing Times for ${cropName}`;
    
    grid.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card ${rec.isOptimal ? 'optimal' : ''}">
            <h3>${rec.season}</h3>
            <p>${formatDate(rec.startDate)} to ${formatDate(rec.endDate)}</p>
            ${rec.isOptimal ? '<div class="optimal-badge"><i class="fas fa-check-circle"></i> Currently Optimal</div>' : ''}
        </div>
    `).join('');
}

// Generate calendar timeline
async function generateCalendar() {
    const sowingDate = document.getElementById('sowingDate').value;
    const crop = document.getElementById('selectedCrop').value;
    const variety = document.getElementById('variety').value;
    const location = document.getElementById('location').value;
    
    if (!sowingDate) {
        alert('Please select a sowing date');
        return;
    }
    
    try {
        const response = await fetch('/api/calculate-timeline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sowingDate: sowingDate,
                crop: crop,
                variety: variety,
                location: location
            })
        });
        
        const timeline = await response.json();
        
        if (timeline.error) {
            alert('Error: ' + timeline.error);
            return;
        }
        
        currentTimeline = timeline;
        displayTimeline(timeline, crop, location);
        
    } catch (error) {
        console.error('Error generating timeline:', error);
        alert('Error generating timeline');
    }
}

// Display the complete timeline
function displayTimeline(timeline, crop, location) {
    // Hide placeholder, show sections
    document.getElementById('placeholder').classList.add('hidden');
    document.getElementById('summarySection').classList.remove('hidden');
    document.getElementById('timelineSection').classList.remove('hidden');
    document.getElementById('criticalFactorsSection').classList.remove('hidden');
    document.getElementById('managementTipsSection').classList.remove('hidden');
    
    // Update summary
    document.getElementById('totalDuration').textContent = `${timeline.totalDuration} days`;
    document.getElementById('expectedHarvest').textContent = formatDate(timeline.expectedHarvest);
    document.getElementById('varietyInfo').textContent = timeline.varietyInfo.name;
    document.getElementById('locationInfo').textContent = location;
    
    // Display timeline stages
    displayTimelineStages(timeline.stages);
    
    // Display critical factors
    displayCriticalFactors(crop);
}

// Display timeline stages
function displayTimelineStages(stages) {
    const container = document.getElementById('timelineContainer');
    
    container.innerHTML = stages.map(stage => {
        const statusClass = stage.isActive ? 'active' : stage.isPast ? 'past' : 'future';
        const statusBadge = stage.isActive ? 'Currently Active' : stage.isPast ? 'Completed' : '';
        const statusBadgeClass = stage.isActive ? 'active' : stage.isPast ? 'completed' : '';
        
        const durationText = stage.duration !== stage.originalDuration 
            ? `Duration: ${stage.duration} days <span class="adjusted">(adjusted from ${stage.originalDuration})</span>`
            : `Duration: ${stage.duration} days`;
        
        const progressPercentage = stage.isPast ? 100 : 
                                 stage.isActive ? calculateProgress(stage.startDate, stage.endDate) : 0;
        
        const progressClass = stage.isPast ? 'past' : stage.isActive ? 'active' : 'future';
        
        return `
            <div class="timeline-item ${statusClass}">
                <div class="timeline-header">
                    <div class="timeline-title">
                        <h3>${stage.stage}</h3>
                        ${statusBadge ? `<span class="status-badge ${statusBadgeClass}">${statusBadge}</span>` : ''}
                    </div>
                    <div class="timeline-dates">
                        <p>${formatDate(stage.startDate)} - ${formatDate(stage.endDate)}</p>
                        <p class="duration">${durationText}</p>
                    </div>
                </div>
                
                <div class="timeline-content">
                    <div class="activities">
                        <h4>Key Activities</h4>
                        ${stage.activities.map(activity => {
                            const activityClass = stage.isPast ? 'completed' : stage.isActive ? 'active' : 'future';
                            const icon = stage.isPast ? 'fa-check-circle' : stage.isActive ? 'fa-play-circle' : 'fa-circle';
                            return `
                                <div class="activity-item ${activityClass}">
                                    <i class="fas ${icon}"></i>
                                    <span>${activity}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="weather-info">
                        <h4>Weather & Conditions</h4>
                        
                        <div class="weather-item temperature">
                            <div class="weather-item-header">
                                <i class="fas fa-thermometer-half"></i>
                                <span>Temperature</span>
                            </div>
                            <p>${stage.weather.temp[0]}°C - ${stage.weather.temp[1]}°C</p>
                        </div>
                        
                        <div class="weather-item rainfall">
                            <div class="weather-item-header">
                                <i class="fas fa-tint"></i>
                                <span>Rainfall</span>
                            </div>
                            <p>${stage.weather.rainfall}mm</p>
                        </div>
                        
                        <div class="weather-item conditions">
                            <div class="weather-item-header">
                                <i class="fas fa-cloud"></i>
                                <span>Conditions</span>
                            </div>
                            <p>${stage.weather.condition}</p>
                            <p>Humidity: ${stage.weather.humidity}%</p>
                        </div>
                        
                        ${stage.weatherAlert.map(alert => `
                            <div class="weather-alert ${alert.type}">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>${alert.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-header">
                        <span>Stage Progress</span>
                        <span>${progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${Math.max(5, progressPercentage)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Display critical factors
function displayCriticalFactors(crop) {
    const cropData = cropsData[crop];
    if (!cropData) return;
    
    const factors = cropData.criticalFactors;
    
    document.getElementById('temperatureFactors').innerHTML = `
        <div class="factor-details">
            <p><span class="label">Optimal:</span> ${factors.temperature.optimal}</p>
            <p><span class="label">Min:</span> ${factors.temperature.min}°C</p>
            <p><span class="label">Max:</span> ${factors.temperature.max}°C</p>
        </div>
    `;
    
    document.getElementById('waterFactors').innerHTML = `
        <div class="factor-details">
            <p><span class="label">Total Need:</span> ${factors.rainfall.requirement}</p>
            <p><span class="label">Critical Period:</span> ${factors.rainfall.critical}</p>
        </div>
    `;
    
    document.getElementById('humidityFactors').innerHTML = `
        <div class="factor-details">
            <p><span class="label">Optimal:</span> ${factors.humidity.optimal}</p>
            <p><span class="label">Note:</span> ${factors.humidity.issue}</p>
        </div>
    `;
    
    // Update section title
    document.querySelector('#criticalFactorsSection h2').innerHTML = 
        `<i class="fas fa-exclamation-triangle"></i> Critical Growth Factors for ${crop}`;
}

// Calculate progress percentage for active stages
function calculateProgress(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (now <= start) return 0;
    if (now >= end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    
    return Math.round((elapsed / total) * 100);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Add event listeners
document.getElementById('sowingDate').addEventListener('change', toggleGenerateButton);
document.getElementById('selectedCrop').addEventListener('change', function() {
    updateVarieties();
    loadOptimalSowing();
});
