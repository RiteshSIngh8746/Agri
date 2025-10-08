from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import requests
from datetime import datetime, timedelta
import random # Imported for mock prediction
import os
import serial
import threading

app = Flask(__name__)

# (Keep all the existing CONFIG AND DATA for the other tabs as it is)
#======================================================================
# CONFIG AND DATA FOR AGRI DYNAMIC CALENDAR
#======================================================================
CROPS_DATA = {
    'Rice': {
        'varieties': {'early': {'duration': 90, 'name': 'Early (90 days)'},'medium': {'duration': 120, 'name': 'Medium (120 days)'},'late': {'duration': 150, 'name': 'Late (150 days)'}},
        'optimalSowing': {'kharif': {'start': '15-Jun', 'end': '15-Jul', 'season': 'Kharif (Monsoon)'},'rabi': {'start': '15-Nov', 'end': '15-Dec', 'season': 'Rabi (Winter)'},'summer': {'start': '15-Feb', 'end': '15-Mar', 'season': 'Summer'}},
        'stages': [{'name': 'Nursery', 'duration': 25, 'activities': ['Seed bed preparation', 'Sowing in nursery', 'Nursery care']},{'name': 'Land Preparation', 'duration': 10, 'activities': ['Field preparation', 'Puddling', 'Leveling']},{'name': 'Transplanting', 'duration': 5, 'activities': ['Transplanting seedlings', 'Gap filling', 'Initial care']},{'name': 'Vegetative Growth', 'duration': 30, 'activities': ['First weeding', 'First top dressing', 'Pest monitoring']},{'name': 'Tillering', 'duration': 25, 'activities': ['Second weeding', 'Second fertilizer', 'Water management']},{'name': 'Panicle Initiation', 'duration': 10, 'activities': ['Final fertilizer', 'Disease control', 'Water level maintenance']},{'name': 'Flowering', 'duration': 10, 'activities': ['Pest control', 'Pollination support', 'Disease monitoring']},{'name': 'Grain Filling', 'duration': 25, 'activities': ['Water management', 'Nutrient spray', 'Bird protection']},{'name': 'Maturation', 'duration': 15, 'activities': ['Reduce irrigation', 'Harvest preparation', 'Quality monitoring']},{'name': 'Harvest', 'duration': 10, 'activities': ['Harvesting', 'Threshing', 'Drying and storage']}],
        'criticalFactors': {'temperature': {'min': 20, 'max': 35, 'optimal': '25-30°C'},'rainfall': {'requirement': '1000-2000mm', 'critical': 'Transplanting and grain filling'},'humidity': {'optimal': '70-80%', 'issue': 'High humidity increases disease risk'}}
    },
    'Wheat': {
        'varieties': {'early': {'duration': 110, 'name': 'Early (110 days)'},'medium': {'duration': 130, 'name': 'Medium (130 days)'},'late': {'duration': 150, 'name': 'Late (150 days)'}},
        'optimalSowing': {'rabi': {'start': '15-Oct', 'end': '30-Nov', 'season': 'Rabi (Winter)'},'late': {'start': '01-Dec', 'end': '25-Dec', 'season': 'Late Rabi'}},
        'stages': [{'name': 'Land Preparation', 'duration': 15, 'activities': ['Deep plowing', 'Seedbed preparation', 'Pre-sowing irrigation']},{'name': 'Sowing', 'duration': 3, 'activities': ['Seed treatment', 'Sowing', 'Light irrigation']},{'name': 'Germination', 'duration': 7, 'activities': ['Monitor emergence', 'Gap filling', 'Weed control']},{'name': 'Tillering', 'duration': 30, 'activities': ['First irrigation', 'First nitrogen', 'Weed management']},{'name': 'Jointing', 'duration': 25, 'activities': ['Second irrigation', 'Second nitrogen', 'Disease monitoring']},{'name': 'Booting', 'duration': 15, 'activities': ['Third irrigation', 'Final fertilizer', 'Pest control']},{'name': 'Flowering', 'duration': 10, 'activities': ['Fourth irrigation', 'Disease control', 'Weather monitoring']},{'name': 'Grain Filling', 'duration': 25, 'activities': ['Final irrigation', 'Nutrient spray', 'Quality care']},{'name': 'Maturation', 'duration': 15, 'activities': ['Stop irrigation', 'Harvest preparation', 'Storage planning']},{'name': 'Harvest', 'duration': 10, 'activities': ['Harvesting', 'Threshing', 'Storage']}],
        'criticalFactors': {'temperature': {'min': 10, 'max': 25, 'optimal': '15-20°C'},'rainfall': {'requirement': '300-400mm', 'critical': 'Excessive rain during harvest harmful'},'humidity': {'optimal': '50-70%', 'issue': 'High humidity causes rust diseases'}}
    },
    'Cotton': {
        'varieties': {'short': {'duration': 160, 'name': 'Short Duration (160 days)'}, 'medium': {'duration': 180, 'name': 'Medium Duration (180 days)'}, 'long': {'duration': 210, 'name': 'Long Duration (210 days)'}},
        'optimalSowing': {'irrigated': {'start': '15-Apr', 'end': '15-May', 'season': 'Irrigated Cotton'},'rainfed': {'start': '15-May', 'end': '15-Jun', 'season': 'Rainfed Cotton'}},
        'stages': [{'name': 'Pre-sowing', 'duration': 20, 'activities': ['Deep plowing', 'FYM application', 'Seedbed preparation']},{'name': 'Sowing', 'duration': 5, 'activities': ['Seed treatment', 'Sowing', 'Light irrigation']},{'name': 'Germination', 'duration': 10, 'activities': ['Gap filling', 'Thinning', 'Early pest control']},{'name': 'Squaring', 'duration': 40, 'activities': ['First weeding', 'Side dressing', 'Pest monitoring']},{'name': 'Flowering', 'duration': 45, 'activities': ['Intensive pest control', 'Second fertilizer', 'Water management']},{'name': 'Boll Formation', 'duration': 35, 'activities': ['Boll protection', 'Nutrient management', 'Disease control']},{'name': 'Boll Development', 'duration': 40, 'activities': ['Final care', 'Quality maintenance', 'Pest control']},{'name': 'First Picking', 'duration': 15, 'activities': ['Quality picking', 'Grade separation', 'Storage']},{'name': 'Second Picking', 'duration': 15, 'activities': ['Final harvest', 'Quality assessment', 'Marketing']},{'name': 'Field Clearing', 'duration': 10, 'activities': ['Stalk destruction', 'Field preparation', 'Residue management']}],
        'criticalFactors': {'temperature': {'min': 18, 'max': 35, 'optimal': '21-30°C'},'rainfall': {'requirement': '500-1000mm', 'critical': 'Avoid excess during flowering'},'humidity': {'optimal': '60-70%', 'issue': 'High humidity increases pest pressure'}}
    },
    'Maize': {
        'varieties': {'early': {'duration': 85, 'name': 'Early (85 days)'},'medium': {'duration': 105, 'name': 'Medium (105 days)'},'late': {'duration': 125, 'name': 'Late (125 days)'}},
        'optimalSowing': {'kharif': {'start': '15-Jun', 'end': '15-Jul', 'season': 'Kharif (Monsoon)'},'rabi': {'start': '15-Oct', 'end': '15-Nov', 'season': 'Rabi (Winter)'},'spring': {'start': '15-Feb', 'end': '15-Mar', 'season': 'Spring'}},
        'stages': [{'name': 'Land Preparation', 'duration': 10, 'activities': ['Plowing', 'Harrowing', 'Seedbed preparation']},{'name': 'Sowing', 'duration': 3, 'activities': ['Seed treatment', 'Sowing', 'Light irrigation']},{'name': 'Emergence', 'duration': 7, 'activities': ['Gap filling', 'Thinning', 'Weed control']},{'name': 'Vegetative Growth', 'duration': 35, 'activities': ['First weeding', 'Side dressing', 'Earthing up']},{'name': 'Tasseling', 'duration': 15, 'activities': ['Second fertilizer', 'Pest control', 'Water management']},{'name': 'Silking', 'duration': 10, 'activities': ['Pollination care', 'Pest monitoring', 'Disease control']},{'name': 'Grain Filling', 'duration': 30, 'activities': ['Final care', 'Bird protection', 'Quality monitoring']},{'name': 'Physiological Maturity', 'duration': 10, 'activities': ['Reduce irrigation', 'Harvest planning']},{'name': 'Harvest', 'duration': 5, 'activities': ['Harvesting', 'Drying', 'Storage']}],
        'criticalFactors': {'temperature': {'min': 15, 'max': 35, 'optimal': '20-30°C'},'rainfall': {'requirement': '500-750mm', 'critical': 'Critical during tasseling-silking'},'humidity': {'optimal': '60-70%', 'issue': 'Low humidity affects pollination'}}
    },
    'Sugarcane': {
        'varieties': {'early': {'duration': 300, 'name': 'Early (10 months)'},'medium': {'duration': 365, 'name': 'Medium (12 months)'},'late': {'duration': 450, 'name': 'Late (15 months)'}},
        'optimalSowing': {'spring': {'start': '15-Feb', 'end': '31-Mar', 'season': 'Spring Planting'},'autumn': {'start': '15-Sep', 'end': '31-Oct', 'season': 'Autumn Planting'}},
        'stages': [{'name': 'Land Preparation', 'duration': 30, 'activities': ['Deep plowing', 'FYM application', 'Furrow making']},{'name': 'Planting', 'duration': 15, 'activities': ['Sett treatment', 'Planting', 'Light irrigation']},{'name': 'Germination', 'duration': 20, 'activities': ['Gap filling', 'Weeding', 'Pest control']},{'name': 'Tillering', 'duration': 60, 'activities': ['Earthing up', 'First fertilizer', 'Intercultivation']},{'name': 'Grand Growth', 'duration': 90, 'activities': ['Second fertilizer', 'Pest management', 'Water management']},{'name': 'Maturation', 'duration': 60, 'activities': ['Final fertilizer', 'Quality monitoring', 'Harvest planning']},{'name': 'Pre-harvest', 'duration': 30, 'activities': ['Reduce irrigation', 'Quality testing', 'Logistics planning']},{'name': 'Harvest', 'duration': 60, 'activities': ['Harvesting', 'Transportation', 'Processing']}],
        'criticalFactors': {'temperature': {'min': 20, 'max': 35, 'optimal': '25-32°C'},'rainfall': {'requirement': '1000-1500mm', 'critical': 'Avoid waterlogging'},'humidity': {'optimal': '70-80%', 'issue': 'High humidity increases disease risk'}}
    }
}
LOCATIONS = {'Kolhapur': {'lat': 28.6139, 'lng': 77.209, 'zone': 'North India'},'Mumbai': {'lat': 19.076, 'lng': 72.8777, 'zone': 'West India'},'Satara': {'lat': 13.0827, 'lng': 80.2707, 'zone': 'South India'},'Pune': {'lat': 22.5726, 'lng': 88.3639, 'zone': 'East India'},'Sangli': {'lat': 12.9716, 'lng': 77.5946, 'zone': 'South India'},'Hyderabad': {'lat': 17.385, 'lng': 78.4867, 'zone': 'South India'},'Pune': {'lat': 18.5204, 'lng': 73.8567, 'zone': 'West India'},'Solapur': {'lat': 26.8467, 'lng': 80.9462, 'zone': 'North India'}}
SEASONAL_WEATHER = {'North India': {0: {'temp': [5, 20], 'rainfall': 15, 'humidity': 60, 'condition': 'Cold and dry'}, 1: {'temp': [8, 23], 'rainfall': 20, 'humidity': 55, 'condition': 'Cool'}, 2: {'temp': [15, 28], 'rainfall': 25, 'humidity': 50, 'condition': 'Pleasant'}, 3: {'temp': [20, 35], 'rainfall': 10, 'humidity': 45, 'condition': 'Warm'}, 4: {'temp': [25, 40], 'rainfall': 20, 'humidity': 40, 'condition': 'Hot'}, 5: {'temp': [28, 42], 'rainfall': 50, 'humidity': 60, 'condition': 'Very hot, pre-monsoon'}, 6: {'temp': [26, 35], 'rainfall': 200, 'humidity': 80, 'condition': 'Monsoon'}, 7: {'temp': [24, 33], 'rainfall': 250, 'humidity': 85, 'condition': 'Heavy monsoon'}, 8: {'temp': [23, 32], 'rainfall': 180, 'humidity': 80, 'condition': 'Monsoon'}, 9: {'temp': [18, 30], 'rainfall': 30, 'humidity': 70, 'condition': 'Post-monsoon'}, 10: {'temp': [12, 26], 'rainfall': 5, 'humidity': 65, 'condition': 'Pleasant'}, 11: {'temp': [7, 22], 'rainfall': 10, 'humidity': 60, 'condition': 'Cool'}}, 'West India': {0: {'temp': [15, 25], 'rainfall': 5, 'humidity': 65, 'condition': 'Cool and dry'}, 1: {'temp': [18, 28], 'rainfall': 10, 'humidity': 60, 'condition': 'Pleasant'}, 2: {'temp': [22, 32], 'rainfall': 15, 'humidity': 55, 'condition': 'Warm'}, 3: {'temp': [25, 35], 'rainfall': 5, 'humidity': 50, 'condition': 'Hot'}, 4: {'temp': [28, 38], 'rainfall': 10, 'humidity': 45, 'condition': 'Very hot'}, 5: {'temp': [30, 40], 'rainfall': 30, 'humidity': 60, 'condition': 'Hot and humid'}, 6: {'temp': [26, 32], 'rainfall': 500, 'humidity': 85, 'condition': 'Heavy monsoon'}, 7: {'temp': [24, 30], 'rainfall': 600, 'humidity': 90, 'condition': 'Peak monsoon'}, 8: {'temp': [24, 31], 'rainfall': 400, 'humidity': 85, 'condition': 'Monsoon'}, 9: {'temp': [25, 32], 'rainfall': 150, 'humidity': 75, 'condition': 'Post-monsoon'}, 10: {'temp': [22, 30], 'rainfall': 20, 'humidity': 70, 'condition': 'Pleasant'}, 11: {'temp': [18, 27], 'rainfall': 5, 'humidity': 65, 'condition': 'Cool'}}, 'South India': {0: {'temp': [18, 28], 'rainfall': 20, 'humidity': 70, 'condition': 'Pleasant'}, 1: {'temp': [20, 30], 'rainfall': 15, 'humidity': 65, 'condition': 'Warm'}, 2: {'temp': [23, 33], 'rainfall': 20, 'humidity': 60, 'condition': 'Hot'}, 3: {'temp': [25, 35], 'rainfall': 30, 'humidity': 65, 'condition': 'Very hot'}, 4: {'temp': [26, 36], 'rainfall': 60, 'humidity': 70, 'condition': 'Hot and humid'}, 5: {'temp': [25, 32], 'rainfall': 120, 'humidity': 85, 'condition': 'Pre-monsoon showers'}, 6: {'temp': [23, 30], 'rainfall': 180, 'humidity': 90, 'condition': 'Monsoon'}, 7: {'temp': [22, 29], 'rainfall': 200, 'humidity': 90, 'condition': 'Heavy monsoon'}, 8: {'temp': [23, 30], 'rainfall': 160, 'humidity': 88, 'condition': 'Monsoon'}, 9: {'temp': [23, 31], 'rainfall': 140, 'humidity': 85, 'condition': 'Retreating monsoon'}, 10: {'temp': [21, 29], 'rainfall': 200, 'humidity': 80, 'condition': 'Northeast monsoon'}, 11: {'temp': [19, 27], 'rainfall': 80, 'humidity': 75, 'condition': 'Pleasant'}}, 'East India': {0: {'temp': [10, 23], 'rainfall': 10, 'humidity': 70, 'condition': 'Cool'}, 1: {'temp': [13, 26], 'rainfall': 15, 'humidity': 65, 'condition': 'Pleasant'}, 2: {'temp': [18, 30], 'rainfall': 25, 'humidity': 60, 'condition': 'Warm'}, 3: {'temp': [23, 34], 'rainfall': 20, 'humidity': 55, 'condition': 'Hot'}, 4: {'temp': [26, 36], 'rainfall': 50, 'humidity': 65, 'condition': 'Very hot'}, 5: {'temp': [28, 35], 'rainfall': 120, 'humidity': 80, 'condition': 'Pre-monsoon'}, 6: {'temp': [26, 32], 'rainfall': 300, 'humidity': 85, 'condition': 'Heavy monsoon'}, 7: {'temp': [25, 31], 'rainfall': 350, 'humidity': 90, 'condition': 'Peak monsoon'}, 8: {'temp': [25, 32], 'rainfall': 250, 'humidity': 85, 'condition': 'Monsoon'}, 9: {'temp': [24, 31], 'rainfall': 180, 'humidity': 80, 'condition': 'Post-monsoon'}, 10: {'temp': [19, 28], 'rainfall': 30, 'humidity': 75, 'condition': 'Pleasant'}, 11: {'temp': [13, 25], 'rainfall': 5, 'humidity': 70, 'condition': 'Cool'}}}

#======================================================================
# CONFIG AND DATA FOR CROP & FERTILIZER PREDICTION
#======================================================================
try:
    crop_model = joblib.load("crop_model.pkl")
    fert_model = joblib.load("fert_model.pkl")
except FileNotFoundError:
    print("CRITICAL ERROR: Make sure 'crop_model.pkl' and 'fert_model.pkl' are in the same directory as app.py.")
    crop_model = fert_model = None
API_KEY = "885e6fb8dc71016a1a06576f498a9a27"
average_rainfall_data = {"Pune": 722, "Mumbai": 2422, "Satara": 1050, "Solapur": 545, "Sangli": 710, "Kolhapur": 1800, "Delhi": 790, "Chennai": 1400, "Kolkata": 1582, "Bangalore": 970, "Hyderabad": 788, "Lucknow": 1014}

#======================================================================
# HELPER FUNCTIONS
#======================================================================
def generate_weather_forecast(date, location):
    month = date.month - 1
    location_data = LOCATIONS.get(location, LOCATIONS['Delhi'])
    zone = location_data['zone']
    zone_weather = SEASONAL_WEATHER.get(zone, SEASONAL_WEATHER['North India'])
    return zone_weather.get(month, zone_weather[0])

def get_weather_alerts(weather, critical_factors, stage_name):
    alerts = []
    if weather['temp'][0] < critical_factors['temperature']['min']: alerts.append({'type': 'warning', 'message': 'Temperature may be too low'})
    if weather['temp'][1] > critical_factors['temperature']['max']: alerts.append({'type': 'warning', 'message': 'High temperature may stress crop'})
    if weather['rainfall'] > 300 and 'harvest' in stage_name.lower(): alerts.append({'type': 'danger', 'message': 'Heavy rain may delay harvest'})
    if weather['humidity'] > 90 and 'flower' in stage_name.lower(): alerts.append({'type': 'warning', 'message': 'High humidity increases disease risk'})
    return alerts

def calculate_timeline(sowing_date_str, crop, variety, location):
    try:
        sowing_date = datetime.strptime(sowing_date_str, '%Y-%m-%d')
    except ValueError:
        return None
    crop_data = CROPS_DATA.get(crop)
    if not crop_data or not crop_data['varieties'].get(variety): return None
    
    timeline, current_date, current_datetime = [], sowing_date, datetime.now()
    for stage in crop_data['stages']:
        stage_start_date = current_date
        weather = generate_weather_forecast(stage_start_date, location)
        adjusted_duration = stage['duration']
        if weather['temp'][0] < crop_data['criticalFactors']['temperature']['min']: adjusted_duration = round(stage['duration'] * 1.2)
        elif weather['temp'][1] > crop_data['criticalFactors']['temperature']['max']: adjusted_duration = round(stage['duration'] * 1.1)
        adjusted_end_date = stage_start_date + timedelta(days=adjusted_duration)
        timeline.append({'stage': stage['name'],'startDate': stage_start_date.strftime('%Y-%m-%d'),'endDate': adjusted_end_date.strftime('%Y-%m-%d'),'duration': adjusted_duration,'activities': stage['activities'],'weather': weather,'isActive': (stage_start_date <= current_datetime <= adjusted_end_date),'isPast': current_datetime > adjusted_end_date,'weatherAlert': get_weather_alerts(weather, crop_data['criticalFactors'], stage['name'])})
        current_date = adjusted_end_date + timedelta(days=1)
    return {'stages': timeline,'totalDuration': (datetime.strptime(timeline[-1]['endDate'], '%Y-%m-%d') - sowing_date).days,'expectedHarvest': timeline[-1]['endDate'],'varietyInfo': crop_data['varieties'].get(variety)}

def get_optimal_sowing_recommendations(crop):
    crop_data = CROPS_DATA.get(crop)
    if not crop_data: return []
    recommendations, current_year, current_date = [], datetime.now().year, datetime.now()
    for key, period in crop_data['optimalSowing'].items():
        try:
            start_date = datetime.strptime(f"{period['start']}-{current_year}", '%d-%b-%Y')
            end_date = datetime.strptime(f"{period['end']}-{current_year}", '%d-%b-%Y')
            if end_date < current_date:
                start_date = start_date.replace(year=current_year + 1)
                end_date = end_date.replace(year=current_year + 1)
            recommendations.append({'season': period['season'],'startDate': start_date.strftime('%Y-%m-%d'),'endDate': end_date.strftime('%Y-%m-%d'),'isOptimal': start_date <= current_date <= end_date})
        except ValueError: continue
    return recommendations
def get_chatbot_response(user_message):
    """
    This is a mock chatbot function. It uses simple keyword matching.
    Replace this with a call to a real NLP model or service.
    """
    lowered_message = user_message.lower()

    # Keyword-based responses
    if "hello" in lowered_message or "hi" in lowered_message:
        return "Hello! I am AgriBot. How can I assist you with your farming questions today?"
    elif "weather" in lowered_message:
        return "You can get weather-based adjustments and timelines in the 'Dynamic Crop Calendar' tab."
    elif "fertilizer" in lowered_message:
        return "For specific fertilizer recommendations based on your soil's nutrient levels, please use the 'Crop & Fertilizer Prediction' tab."
    elif "labour" in lowered_message or "cost" in lowered_message: # Corrected spelling for broader matching
        return "You can estimate agricultural labor costs using the 'Labor Cost Prediction' tab."
    elif "bye" in lowered_message:
        return "Goodbye! Happy farming!"

    # Default response
    return "I'm sorry, I don't have specific information on that. I can help with general questions about fertilizer, labor costs, and weather planning."

#======================================================================

#======================================================================
# FLASK ROUTES
#======================================================================
@app.route('/')
def index():
    cities = list(average_rainfall_data.keys())
    return render_template("index.html", cities=cities)

@app.route('/api/crops')
def get_crops():
    return jsonify(CROPS_DATA)

@app.route('/api/calculate-timeline', methods=['POST'])
def api_calculate_timeline():
    data = request.json
    timeline = calculate_timeline(data.get('sowingDate'), data.get('crop'), data.get('variety'), data.get('location'))
    if timeline is None: return jsonify({'error': 'Invalid parameters'}), 400
    return jsonify(timeline)

@app.route('/api/optimal-sowing/<crop>')
def api_optimal_sowing(crop):
    return jsonify(get_optimal_sowing_recommendations(crop))

@app.route("/api/get_weather", methods=["GET"])
def get_weather():
    city = request.args.get("city")
    if not city: return jsonify({"error": "City name is required"}), 400
    weather_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    try:
        res_weather = requests.get(weather_url, timeout=10)
        res_weather.raise_for_status()
        data_weather = res_weather.json()
    except requests.exceptions.RequestException as e:
        print(f"Weather API Error: {e}")
        return jsonify({"error": "Could not retrieve data from weather service."}), 503
    return jsonify({"temperature": data_weather.get("main", {}).get("temp", "N/A"),"humidity": data_weather.get("main", {}).get("humidity", "N/A"),"rainfall": average_rainfall_data.get(city, "N/A")})

@app.route("/api/predict", methods=["POST"])
def predict_crop_and_fertilizer():
    if not crop_model or not fert_model: return jsonify({"error": "ML models are not loaded on the server"}), 500
    try:
        form_data = {
            "District_Name": request.form["District_Name"], "Soil_color": request.form["Soil_color"],
            "Nitrogen": float(request.form["Nitrogen"]), "Phosphorus": float(request.form["Phosphorus"]),
            "Potassium": float(request.form["Potassium"]), "pH": float(request.form["pH"]),
            "Rainfall": float(request.form["Rainfall"]), "Temperature": float(request.form["Temperature"]),
            "Humidity": float(request.form["Humidity"])
        }
        input_df = pd.DataFrame([form_data])
        crop_pred = crop_model.predict(input_df)[0]
        fert_pred = fert_model.predict(input_df)[0]
        return jsonify({"crop": crop_pred, "fertilizer": fert_pred})
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({"error": "Invalid data provided for prediction."}), 400
  
@app.route("/api/chat", methods=['POST'])
def handle_chat():
    """
    Handles chat messages from the user and returns a bot response.
    """
    data = request.json
    user_message = data.get("message")

    if not user_message:
        return jsonify({"error": "No message provided."}), 400

    bot_response = get_chatbot_response(user_message)
    return jsonify({"response": bot_response})



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)