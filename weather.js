const DOM = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    unitToggleBtn: document.getElementById('unit-toggle'),
    loadingContainer: document.getElementById('loading-container'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    weatherDashboard: document.getElementById('weather-dashboard'),
    currentTemperature: document.getElementById('current-temperature'),
    currentCityName: document.getElementById('current-city-name'),
    weatherFeelingText: document.getElementById('weather-feeling-text'),
    weatherDescription: document.getElementById('weather-description'),
    windSpeedValue: document.getElementById('wind-speed-value'),
    forecastContainer: document.getElementById('forecast-container')
};

let isCelsius = true;
let currentTemperatureC = null;
let currentCityNameString = "";
let currentWindSpeed = null;
let forecastDaysArray = [];

const WMO_WEATHER_CODES = {
    0: { text: "Clear Sky", icon: "fa-sun" },
    1: { text: "Mainly Clear", icon: "fa-cloud-sun" },
    2: { text: "Partly Cloudy", icon: "fa-cloud" },
    3: { text: "Overcast", icon: "fa-cloud" },
    45: { text: "Foggy", icon: "fa-smog" },
    48: { text: "Depositing Rime Fog", icon: "fa-smog" },
    51: { text: "Light Drizzle", icon: "fa-cloud-rain" },
    61: { text: "Slight Rain", icon: "fa-cloud-showers-heavy" },
    71: { text: "Light Snowfall", icon: "fa-snowflake" },
    95: { text: "Thunderstorm", icon: "fa-cloud-bolt" }
};

function convertToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}

function calculateWeatherFeeling(tempC) {
    if (tempC <= 0) return "Cold";
    if (tempC > 0 && tempC <= 10) return "Cool";
    if (tempC > 10 && tempC <= 20) return "Moderate";
    return "Warm";
}

function getWeatherMeta(code) {
    return WMO_WEATHER_CODES[code] || { text: "Unspecified Condition", icon: "fa-cloud" };
}

function showLoading() {
    DOM.loadingContainer.style.display = "block";
    DOM.errorContainer.style.display = "none";
    DOM.weatherDashboard.style.display = "none";
}

function hideLoading() {
    DOM.loadingContainer.style.display = "none";
}

function displayError(message) {
    DOM.loadingContainer.style.display = "none";
    DOM.weatherDashboard.style.display = "none";
    DOM.errorMessage.textContent = message;
    DOM.errorContainer.style.display = "block";
}

function updateWeatherUI() {
    if (currentTemperatureC === null) return;

    const tempValue = isCelsius ? currentTemperatureC : convertToFahrenheit(currentTemperatureC);
    const unitSymbol = isCelsius ? "°C" : "°F";

    DOM.currentTemperature.textContent = `${tempValue.toFixed(1)}${unitSymbol}`;
    DOM.currentCityName.textContent = currentCityNameString;
    DOM.windSpeedValue.textContent = currentWindSpeed.toFixed(1);
    DOM.weatherFeelingText.textContent = calculateWeatherFeeling(currentTemperatureC);
    DOM.unitToggleBtn.textContent = isCelsius ? "Switch to °F" : "Switch to °C";

    DOM.forecastContainer.innerHTML = "";

    forecastDaysArray.forEach(day => {
        const displayForecastTemp = isCelsius ? day.maxTemp : convertToFahrenheit(day.maxTemp);
        
        const cardHTML = `
            <div class="forecast-card">
                <div class="forecast-temp">${displayForecastTemp.toFixed(1)}${unitSymbol}</div>
                <i class="fa-solid ${day.iconClass}"></i>
                <div class="forecast-day">${day.dayName}</div>
            </div>
        `;
        DOM.forecastContainer.innerHTML += cardHTML;
    });

    DOM.weatherDashboard.style.display = "block";
}

async function fetchWeatherData(cityName) {
    showLoading();

    try {
        const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geocodingUrl);
        
        if (!geoResponse.ok) throw new Error("Failed to contact geocoding service.");
        
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`City "${cityName}" not found. Try another one.`);
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        currentCityNameString = `${name}, ${country}`;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) throw new Error("Failed to fetch weather data from server.");
        
        const weatherData = await weatherResponse.json();

        currentTemperatureC = weatherData.current_weather.temperature;
        currentWindSpeed = weatherData.current_weather.windspeed;
        
        const currentWeatherMeta = getWeatherMeta(weatherData.current_weather.weathercode);
        DOM.weatherDescription.textContent = currentWeatherMeta.text;

        forecastDaysArray = [];
        const dailyData = weatherData.daily;

        for (let i = 1; i <= 5; i++) {
            if (!dailyData.time[i]) break;

            const dateObj = new Date(dailyData.time[i]);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayMeta = getWeatherMeta(dailyData.weathercode[i]);

            forecastDaysArray.push({
                dayName: dayOfWeek,
                maxTemp: dailyData.temperature_2m_max[i],
                iconClass: dayMeta.icon
            });
        }

        hideLoading();
        updateWeatherUI();

    } catch (error) {
        displayError(error.message);
    }
}

DOM.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const targetCity = DOM.searchInput.value.trim();
    
    if (targetCity) {
        fetchWeatherData(targetCity);
    }
});

DOM.unitToggleBtn.addEventListener('click', () => {
    isCelsius = !isCelsius;
    updateWeatherUI();
});