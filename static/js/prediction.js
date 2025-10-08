document.addEventListener('DOMContentLoaded', function() {
    // Only run if the prediction tab elements exist on the page
    const citySelect = document.getElementById("citySelect");
    const predictionForm = document.getElementById("predictionForm");

    if (citySelect && predictionForm) {
        citySelect.addEventListener("change", fetchWeatherForCity);
        predictionForm.addEventListener("submit", handlePredictionSubmit);
    }
});

function fetchWeatherForCity() {
    let city = this.value;
    if (!city) return;

    // *** THIS IS THE MAIN FIX FOR THE WEATHER FETCH ***
    // The URL /api/get_weather must match the route in app.py
    fetch(`/api/get_weather?city=${city}`)
        .then(response => {
            if (!response.ok) {
                // Handle HTTP errors like 404 or 500
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert("Server Error: " + data.error);
            } else {
                document.getElementById("temperature").value = data.temperature;
                document.getElementById("humidity").value = data.humidity;
                document.getElementById("rainfall").value = data.rainfall;
            }
        })
        .catch(err => {
            console.error("Weather fetch error:", err);
            // This is the error you saw
            alert("Failed to fetch weather data. Please check the console.");
        });
}

function handlePredictionSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(this);
    const resultDiv = document.getElementById("predictionResult");
    
    fetch("/api/predict", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            alert("Prediction Error: " + data.error);
            resultDiv.style.display = 'none';
        } else {
            document.getElementById("cropResult").textContent = data.crop;
            document.getElementById("fertResult").textContent = data.fertilizer;
            resultDiv.style.display = 'block';
        }
    })
    .catch(err => {
        console.error("Prediction fetch error:", err);
        alert("An error occurred while making the prediction. See console for details.");
        resultDiv.style.display = 'none';
    });
}