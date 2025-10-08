document.addEventListener('DOMContentLoaded', () => {
    // Scope script to the forecast tab
    const forecastBtn = document.getElementById('get-forecast-btn');
    if (!forecastBtn) {
        return;
    }

    const locationSelect = document.getElementById('location-select');
    const forecastResult = document.getElementById('forecast-result');

    forecastBtn.addEventListener('click', getSeasonalForecast);

    async function getSeasonalForecast() {
        const location = locationSelect.value;
        if (!location) {
            alert('Please select a location.');
            return;
        }

        // Show loading state
        forecastResult.innerHTML = `<p class="loading">Fetching seasonal outlook...</p>`;
        forecastBtn.disabled = true;

        try {
            // Fetch from the new seasonal forecast endpoint
            const response = await fetch(`/api/seasonal_forecast?location=${location}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An unknown error occurred.');
            }

            displaySeasonalForecast(data);

        } catch (error) {
            console.error('Seasonal Forecast Error:', error);
            forecastResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            // Reset button state
            forecastBtn.disabled = false;
        }
    }

    function displaySeasonalForecast(forecastData) {
        if (!forecastData || forecastData.length === 0) {
            forecastResult.innerHTML = `<p class="placeholder">No seasonal data available for this location.</p>`;
            return;
        }

        let forecastHTML = '';
        forecastData.forEach(month => {
            forecastHTML += `
                <div class="forecast-card">
                    <h3>${month.month}</h3>
                    <p class="condition">${month.condition}</p>
                    <p><strong>Temp:</strong> ${month.temp_min}° to ${month.temp_max}°C</p>
                    <p><strong>Rainfall:</strong> ${month.rainfall} mm</p>
                    <p><strong>Humidity:</strong> ${month.humidity}%</p>
                </div>
            `;
        });

        forecastResult.innerHTML = forecastHTML;
    }
});