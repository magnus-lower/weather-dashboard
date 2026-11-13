import assert from 'node:assert/strict';
import {beforeEach, test} from 'node:test';

// Modules also expose browser globals; importing them should not start the app.
globalThis.window = {};
globalThis.document = {addEventListener() {}};
const {WeatherDisplay} = await import('../../static/js/ui/weather-display.js');
const {WeatherAPI} = await import('../../static/js/api/weather-api.js');
const {Favorites} = await import('../../static/js/features/favorites.js');
const {CitySearch} = await import('../../static/js/features/city-search.js');
const {WeatherApp} = await import('../../static/js/main.js');
const {UIUtils} = await import('../../static/js/core/ui-utils.js');

const originalDisplay = {...WeatherDisplay};
const originalAPI = {...WeatherAPI};
const originalUI = {...UIUtils};

beforeEach(() => {
    Object.assign(WeatherDisplay, originalDisplay);
    Object.assign(WeatherAPI, originalAPI, {requestId: 0, weatherController: null});
    Object.assign(UIUtils, originalUI);
    WeatherDisplay.forecastRequestId = 0;
    WeatherDisplay.forecastController = null;
    window.WeatherApp = {updateState() {}, hideInitialLoader() {}};
    globalThis.alert = () => {};
    UIUtils.showLoadingSpinner = () => {};
    UIUtils.hideLoadingSpinner = () => {};
});

test('precipitation uses probability, preserves zero, and rejects missing values', () => {
    assert.equal(WeatherDisplay.precipitationPercent(0.1), 10);
    assert.equal(WeatherDisplay.precipitationPercent(0), 0);
    assert.equal(WeatherDisplay.precipitationPercent(1), 100);
    for (const value of [undefined, null, NaN, -1, 2, '0.5']) {
        assert.equal(WeatherDisplay.precipitationPercent(value), null);
    }
});

test('location time and daily grouping use the location offset', () => {
    const timestamp = Date.parse('2026-01-01T22:00:00Z') / 1000;
    assert.equal(WeatherDisplay.formatLocationTime(timestamp, 3 * 3600), '01:00');
    const entry = (dt, temp, pop) => ({dt, main: {temp}, pop,
        weather: [{main: 'Rain', description: 'light rain'}]});
    const days = WeatherDisplay.processDailyForecastData([
        entry(timestamp, 10, 0.1), entry(timestamp + 3 * 3600, 12, 0.6)
    ], 3 * 3600);
    assert.equal(days.length, 1);
    assert.equal(days[0].main.temp_min, 10);
    assert.equal(days[0].main.temp_max, 12);
    assert.equal(days[0].pop, 0.6);
    assert.equal(WeatherDisplay.processDailyForecastData([entry(timestamp, 10)], 0)[0].pop, null);
});

test('weather icon paths cannot inject HTML or arbitrary URLs', () => {
    assert.equal(WeatherDisplay.iconUrl('01d'), 'https://openweathermap.org/img/wn/01d@2x.png');
    assert.equal(WeatherDisplay.iconUrl('" onerror="alert(1)'), '');
});

test('corrupt, unavailable, or incorrectly shaped favorites do not throw', () => {
    for (const value of ['{broken', '{}', 'null', '42']) {
        globalThis.localStorage = {getItem: () => value};
        assert.deepEqual(Favorites.loadFavorites(), []);
    }
    globalThis.localStorage = {getItem() {throw new Error('storage denied');}};
    assert.deepEqual(Favorites.loadFavorites(), []);
    globalThis.localStorage = {getItem: () => '[null,2,"Oslo, NO",""]'};
    assert.deepEqual(Favorites.loadFavorites(), ['Oslo, NO']);
});

test('manual country searches send and update the parsed country', () => {
    document.getElementById = () => ({value: 'London, gb'});
    let requested;
    WeatherAPI.fetchWeatherData = (endpoint, params) => {requested = {endpoint, params};};
    WeatherApp.fetchWeatherForInputCity();
    assert.equal(requested.endpoint, '/weather');
    assert.equal(requested.params.city, 'London');
    assert.equal(requested.params.country.toUpperCase(), 'GB');
    assert.equal(WeatherApp.state.lastCountry, 'GB');
});

test('an older weather response cannot replace a newer selection', async () => {
    const pending = [], rendered = [];
    globalThis.fetch = () => new Promise(resolve => pending.push(resolve));
    WeatherDisplay.displayWeatherData = data => rendered.push(data.name);
    const first = WeatherAPI.fetchWeatherData('/weather', {city: 'Oslo'});
    const second = WeatherAPI.fetchWeatherData('/weather', {city: 'Bergen'});
    pending[1]({ok: true, json: async () => ({name: 'Bergen'})});
    await second;
    pending[0]({ok: true, json: async () => ({name: 'Oslo'})});
    await first;
    assert.deepEqual(rendered, ['Bergen']);
});

test('forecast responses are invalidated immediately when a new search starts', async () => {
    let resolve;
    const rendered = [];
    globalThis.fetch = () => new Promise(done => {resolve = done;});
    WeatherDisplay.displayHourlyAndDailyForecast = data => rendered.push(data);
    const pending = WeatherDisplay.fetchAndDisplayForecast(59, 10);
    WeatherDisplay.cancelForecast();
    resolve({ok: true, json: async () => ({list: []})});
    await pending;
    assert.deepEqual(rendered, []);
});

test('coordinate weather does not depend on a reverse-geocoding response', async () => {
    const urls = [];
    globalThis.fetch = async url => {
        urls.push(url);
        return {ok: true, json: async () => ({name: 'Oslo', sys: {country: 'NO'}})};
    };
    document.getElementById = () => ({});
    window.CitySearch = {positionClearButton() {}};
    WeatherDisplay.displayWeatherData = () => {};
    await WeatherAPI.fetchWeatherData('/weather_by_coords', {lat: 59, lon: 10, unit: 'metric'});
    assert.equal(urls.length, 1);
    assert.ok(urls[0].startsWith('/weather_by_coords?'));
});

test('closed autocomplete cannot be reopened by an outstanding response', async () => {
    const input = {value: 'Oslo', setAttribute() {}, removeAttribute() {}};
    document.activeElement = input;
    document.getElementById = id => id === 'cityInput' ? input : {replaceChildren() {}};
    let resolve;
    WeatherAPI.fetchCitySuggestions = () => new Promise(done => {resolve = done;});
    let rendered = false;
    const display = CitySearch.displayCitySuggestions;
    CitySearch.displayCitySuggestions = () => {rendered = true;};
    try {
        const pending = CitySearch.fetchAndDisplaySuggestions('Oslo');
        CitySearch.clearCitySuggestions();
        resolve([{name: 'Oslo', country: 'NO'}]);
        await pending;
        assert.equal(rendered, false);
    } finally {
        CitySearch.displayCitySuggestions = display;
    }
});

test('replacing backgrounds clears interval and timeout handles', () => {
    document.querySelector = () => null;
    const intervals = [], timeouts = [];
    const realInterval = globalThis.clearInterval, realTimeout = globalThis.clearTimeout;
    globalThis.clearInterval = id => intervals.push(id);
    globalThis.clearTimeout = id => timeouts.push(id);
    try {
        WeatherDisplay.animationIntervals = [11, 12];
        WeatherDisplay.animationTimeouts = [21];
        WeatherDisplay.clearWeatherAnimations();
        assert.deepEqual(intervals, [11, 12]);
        assert.deepEqual(timeouts, [21]);
        assert.deepEqual(WeatherDisplay.animationIntervals, []);
    } finally {
        globalThis.clearInterval = realInterval;
        globalThis.clearTimeout = realTimeout;
    }
});

test('untrusted search, weather, and favorite values are rendered as text', () => {
    // A DOM double that rejects HTML sinks; text/attribute operations remain available.
    class Element {
        children = [];
        attributes = {};
        style = {};
        className = '';
        text = '';
        classList = {add() {}, remove() {}, contains() {return false;}};
        set innerHTML(value) {throw new Error('HTML sink used: ' + value);}
        set textContent(value) {this.text = String(value); this.children = [];}
        get textContent() {return this.text + this.children.map(child => child.textContent).join('');}
        append(...children) {this.children.push(...children);}
        appendChild(child) {this.append(child); return child;}
        replaceChildren(...children) {this.children = children; this.text = '';}
        setAttribute(name, value) {this.attributes[name] = value;}
        removeAttribute(name) {delete this.attributes[name];}
        addEventListener() {}
    }
    const nodes = new Map();
    globalThis.document = {
        createElement: () => new Element(),
        createDocumentFragment: () => new Element(),
        createTextNode(text) {const node = new Element(); node.textContent = text; return node;},
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id, new Element());
            return nodes.get(id);
        }
    };
    const input = '<img src=x onerror=alert(1)>';
    assert.equal(CitySearch.highlightMatch(input, 'img').textContent, input);
    CitySearch.displayCitySuggestions([], input);
    assert.ok(document.getElementById('citySuggestions').textContent.includes(input));
    const suggestion = {name: input, country: 'NO', lat: 0, lon: 0};
    CitySearch.displayCitySuggestions([suggestion], 'img');
    assert.ok(document.getElementById('citySuggestions').textContent.includes(input));
    const firstOption = document.getElementById('citySuggestions').children[0];
    assert.equal(firstOption.attributes['aria-selected'], 'true');
    assert.equal(document.getElementById('cityInput').attributes['aria-expanded'], 'true');
    WeatherDisplay.updateBackground = () => {};
    WeatherDisplay.fetchAndDisplayForecast = () => {};
    WeatherDisplay.displayWeatherData({name: input, main: {temp: 1, feels_like: 0, humidity: 80},
        weather: [{icon: '01d', description: 'clear sky', main: 'Clear'}],
        sys: {country: 'NO', sunrise: 1, sunset: 2}, coord: {lat: 0, lon: 0}, wind: {speed: 1}});
    const text = document.getElementById('weatherData').textContent;
    assert.ok(text.includes(input));
    assert.ok(text.includes('UV-indeksIkke tilgjengelig'));
    globalThis.localStorage = {getItem: () => JSON.stringify([input])};
    Favorites.updateFavoritesDisplay();
    assert.ok(document.getElementById('favoritesList').textContent.includes(input));
    const select = document.getElementById('favoritesList').children[0].children[0];
    assert.equal(select.type, 'button');
});
