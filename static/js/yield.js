document.addEventListener('DOMContentLoaded', function () {
    // Scope the script to the yield prediction tab
    const yieldForm = document.getElementById('yield-form');
    if (!yieldForm) {
        return;
    }

    const stateSelect = document.getElementById('state');
    const districtSelect = document.getElementById('district');
    const cropSelect = document.getElementById('crop');
    const predictButton = document.getElementById('predict-button');
    const resultContainer = document.getElementById('result-container');
    const resultEl = document.getElementById('result');

    // Data for populating dropdowns
    const state_dist = {
        "Maharashtra": ["PUNE", "NASHIK", "NAGPUR", "MUMBAI"],
        "Karnataka": ["BENGALURU", "MYSURU", "MANGALURU"],
        "Tamil Nadu": ["CHENNAI", "COIMBATORE", "MADURAI"]
    };

    const dist_crop = {
        "PUNE": ["Rice", "Wheat", "Sugarcane"],
        "NASHIK": ["Grapes", "Onion", "Tomato"],
        "NAGPUR": ["Orange", "Cotton", "Soyabean"],
        "MUMBAI": ["Rice", "Vegetables"],
        "BENGALURU": ["Ragi", "Maize", "Vegetables"],
        "MYSURU": ["Sugarcane", "Rice", "Tobacco"],
        "MANGALURU": ["Arecanut", "Cashewnut", "Coconut"],
        "CHENNAI": ["Rice", "Groundnut"],
        "COIMBATORE": ["Cotton", "Turmeric", "Banana"],
        "MADURAI": ["Paddy", "Jasmine", "Banana"]
    };

    // Populate States
    for (const state in state_dist) {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    }

    // Handle State Change
    stateSelect.addEventListener('change', function () {
        const selectedState = this.value;
        districtSelect.innerHTML = '<option value="">Select District</option>';
        cropSelect.innerHTML = '<option value="">Select Crop</option>';

        if (selectedState && state_dist[selectedState]) {
            state_dist[selectedState].forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
    });

    // Handle District Change
    districtSelect.addEventListener('change', function () {
        const selectedDistrict = this.value;
        cropSelect.innerHTML = '<option value="">Select Crop</option>';

        if (selectedDistrict && dist_crop[selectedDistrict]) {
            dist_crop[selectedDistrict].forEach(crop => {
                const option = document.createElement('option');
                option.value = crop;
                option.textContent = crop;
                cropSelect.appendChild(option);
            });
        }
    });

    // Handle Form Submission
    yieldForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData(this);

        // Show loading state
        predictButton.textContent = 'Predicting...';
        predictButton.disabled = true;

        // IMPORTANT: Fetch from the new backend endpoint
        fetch('/api/predict_yield', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            resultContainer.style.display = 'block';
            if (data.error) {
                resultEl.textContent = `Error: ${data.error}`;
                resultEl.style.color = 'red';
            } else {
                resultEl.textContent = `Predicted Yield: ${data.prediction}`;
                resultEl.style.color = 'black';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultContainer.style.display = 'block';
            resultEl.textContent = 'An error occurred. Please try again.';
            resultEl.style.color = 'red';
        })
        .finally(() => {
            // Reset button state
            predictButton.textContent = 'Predict Yield';
            predictButton.disabled = false;
        });
    });
});