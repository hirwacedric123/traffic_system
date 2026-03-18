let map;
let directionsService;
let directionsRenderer;
let placesService;

function initMap() {
    // Initialize the map centered on Kigali
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -1.9441, lng: 30.0619 },
        zoom: 13
    });

    // Initialize directions and places services
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    placesService = new google.maps.places.PlacesService(map);

    // Initialize autocomplete for input fields
    initializeAutocomplete('start');
    initializeAutocomplete('end');
}

function initializeAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'RW' },
        fields: ['place_id', 'geometry', 'name']
    });
}

function getDirections() {
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.querySelector('.loading');

    if (!startInput.value || !endInput.value) {
        showError('Please enter both start and destination locations');
        return;
    }

    loadingDiv.classList.add('active');
    errorDiv.style.display = 'none';

    // Request directions with alternatives
    const request = {
        origin: startInput.value,
        destination: endInput.value,
        travelMode: 'DRIVING',
        provideRouteAlternatives: true
    };

    directionsService.route(request, (response, status) => {
        loadingDiv.classList.remove('active');

        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            currentRoute = response; // Store the route data for navigation
            displayRouteOptions(response.routes);
        } else {
            showError('Could not calculate directions. Please try again.');
        }
    });
}

function displayRouteOptions(routes) {
    const routeInfo = document.getElementById('routeInfo');
    routeInfo.innerHTML = '<h2>Available Routes</h2>';

    routes.forEach((route, index) => {
        // Simulate traffic conditions (in a real app, this would come from traffic API)
        const trafficConditions = getSimulatedTrafficCondition();
        const duration = route.legs[0].duration.text;
        const distance = route.legs[0].distance.text;
        const isRecommended = index === 0;

        const routeElement = document.createElement('div');
        routeElement.className = 'route-option';
        routeElement.innerHTML = `
            <div class="route-header">
                <h3>
                    <span class="traffic-indicator ${trafficConditions.level}">
                        ${trafficConditions.icon}
                    </span>
                    Route ${index + 1}
                    ${isRecommended ? '<span class="recommended">Recommended</span>' : ''}
                </h3>
            </div>
            <div class="route-details">
                <p><strong>Estimated Time:</strong> ${duration}</p>
                <p><strong>Distance:</strong> ${distance}</p>
            </div>
            <div class="traffic-details ${trafficConditions.level}">
                <p><strong>Traffic Status:</strong> ${trafficConditions.description}</p>
                ${trafficConditions.warning ? `
                    <div class="warning">
                        ⚠️ ${trafficConditions.warning}
                    </div>
                ` : ''}
            </div>
        `;

        routeElement.addEventListener('click', () => {
            directionsRenderer.setRouteIndex(index);
            highlightSelectedRoute(index);
        });

        routeInfo.appendChild(routeElement);
    });
}

function getSimulatedTrafficCondition() {
    // Simulate different traffic conditions
    const conditions = [
        {
            level: 'light',
            icon: '🟢',
            description: 'Light traffic, smooth flow',
            warning: null
        },
        {
            level: 'moderate',
            icon: '🟡',
            description: 'Moderate traffic, some delays',
            warning: 'Expected delays of 5-10 minutes due to ongoing road work'
        },
        {
            level: 'heavy',
            icon: '🔴',
            description: 'Heavy traffic, significant delays',
            warning: 'Major congestion reported. Consider alternative routes'
        }
    ];

    return conditions[Math.floor(Math.random() * conditions.length)];
}

function highlightSelectedRoute(selectedIndex) {
    const routes = document.querySelectorAll('.route-option');
    routes.forEach((route, index) => {
        route.style.backgroundColor = index === selectedIndex ? '#e3f2fd' : '#f8f9fa';
    });
}

function displayRouteOptions(routes) {
    const routeInfo = document.getElementById('routeInfo');
    routeInfo.innerHTML = '<h2>Available Routes</h2>';

    routes.forEach((route, index) => {
        const trafficConditions = getSimulatedTrafficCondition();
        const duration = route.legs[0].duration.text;
        const distance = route.legs[0].distance.text;
        const isRecommended = index === 0;

        // Extract road numbers from the route
        const roadNumbers = extractRoadNumbers(route);
        const roadNumbersDisplay = roadNumbers.length > 0 
            ? `<p><strong>Roads:</strong> ${roadNumbers.join(' → ')}</p>`
            : '<p><strong>Roads:</strong> Local roads</p>';

        const routeElement = document.createElement('div');
        routeElement.className = 'route-option';
        routeElement.innerHTML = `
            <div class="route-header">
                <h3>
                    <span class="traffic-indicator ${trafficConditions.level}">
                        ${trafficConditions.icon}
                    </span>
                    Route ${index + 1}
                    ${isRecommended ? '<span class="recommended">Recommended</span>' : ''}
                </h3>
            </div>
            <div class="route-details">
                <p><strong>Estimated Time:</strong> ${duration}</p>
                <p><strong>Distance:</strong> ${distance}</p>
                ${roadNumbersDisplay}
            </div>
            <div class="traffic-details ${trafficConditions.level}">
                <p><strong>Traffic Status:</strong> ${trafficConditions.description}</p>
                ${trafficConditions.warning ? `
                    <div class="warning">
                        ⚠️ ${trafficConditions.warning}
                    </div>
                ` : ''}
            </div>
            <div class="route-actions">
                <button class="btn-navigate" onclick="startNavigation(${index})">
                    🚗 Start Navigation
                </button>
            </div>
        `;

        routeElement.addEventListener('click', () => {
            directionsRenderer.setRouteIndex(index);
            highlightSelectedRoute(index);
        });

        routeInfo.appendChild(routeElement);
    });
}

function extractRoadNumbers(route) {
    const roadNumbers = [];
    
    // Check if route has steps
    if (route.legs && route.legs[0] && route.legs[0].steps) {
        route.legs[0].steps.forEach(step => {
            // Extract road numbers from instructions
            // Look for common Rwanda road number formats (KK, RN, etc.)
            const matches = step.instructions.match(/\b(KK|RN)\s*\d+\b/g);
            if (matches) {
                matches.forEach(roadNumber => {
                    if (!roadNumbers.includes(roadNumber)) {
                        roadNumbers.push(roadNumber);
                    }
                });
            }
        });
    }
    
    return roadNumbers;
}

// Navigation variables
let currentRoute = null;
let navigationMode = false;
let userLocation = null;
let locationWatcher = null;

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Start navigation mode
function startNavigation(routeIndex) {
    if (!currentRoute) {
        showError('No route selected. Please get directions first.');
        return;
    }
    
    const route = currentRoute.routes[routeIndex];
    if (!route) {
        showError('Route not found.');
        return;
    }
    
    // Store route data
    currentRoute.selectedRouteIndex = routeIndex;
    currentRoute.selectedRoute = route;
    
    // Enter full-screen navigation mode
    enterNavigationMode();
    
    // Start location tracking
    startLocationTracking();
}

// Enter full-screen navigation mode
function enterNavigationMode() {
    navigationMode = true;
    // Hide main content
    document.getElementById('controls').style.display = 'none';
    document.getElementById('routeInfo').style.display = 'none';
    document.getElementById('reported-issues-section').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    // Show navigation header
    showNavigationHeader();
    // Show navigation footer
    showNavigationFooter();
    // Make map full screen
    const mapContainer = document.getElementById('map-container');
    mapContainer.classList.add('nav-fullscreen');
    // Trigger map resize
    google.maps.event.trigger(map, 'resize');
    // Center map on the route
    const bounds = new google.maps.LatLngBounds();
    currentRoute.selectedRoute.overview_path.forEach(point => {
        bounds.extend(point);
    });
    map.fitBounds(bounds);
}

// Show navigation header
function showNavigationHeader() {
    const header = document.querySelector('header');
    header.innerHTML = `
        <div class="nav-header-bar">
            <div class="nav-header-left">
                <span class="nav-header-icon">🚗</span>
                <span class="nav-header-title">Navigation Active</span>
                <span class="nav-header-route">
                    <span class="nav-header-from">${document.getElementById('start').value}</span>
                    <span class="nav-header-arrow">→</span>
                    <span class="nav-header-to">${document.getElementById('end').value}</span>
                </span>
                </div>
            <div class="nav-header-actions">
                <button onclick="toggleMapType()" id="map-type-btn" class="nav-header-btn">
                    <span>🗺️</span>
                    <span id="map-type-text">Map</span>
                </button>
                <button onclick="exitNavigation()" class="nav-header-btn nav-header-exit">
                    ✕ Exit
                </button>
            </div>
        </div>
    `;
}

// Show navigation footer
function showNavigationFooter() {
    const footer = document.createElement('div');
    footer.id = 'navigation-footer';
    footer.className = 'nav-footer-bar';
    footer.innerHTML = `
        <div class="nav-footer-content">
            <div class="nav-info">
                <div class="nav-info-value" id="nav-distance">
                    ${currentRoute.selectedRoute.legs[0].distance.text}
                </div>
                <div class="nav-info-label">📏 Distance Remaining</div>
                </div>
            <div class="nav-info">
                <div class="nav-info-value" id="nav-time">
                    ${currentRoute.selectedRoute.legs[0].duration.text}
                </div>
                <div class="nav-info-label">⏱️ Time Remaining</div>
                </div>
            <div class="nav-info">
                <div class="nav-info-value" id="nav-speed">
                    -- km/h
                </div>
                <div class="nav-info-label">🚗 Current Speed</div>
                </div>
            <div class="nav-actions">
                <button onclick="recenterMap()" id="recenter-btn" class="nav-footer-btn">
                    <span style="font-size: 1.1em;">📍</span>
                    <span>Recenter</span>
                </button>
            </div>
        </div>
        <div class="nav-progress-container">
            <div id="nav-progress-bar" class="nav-progress-bar"></div>
        </div>
    `;
    document.body.appendChild(footer);

    // Ensure the fullscreen map always ends exactly above the footer
    const updateNavFooterHeightVar = () => {
        document.documentElement.style.setProperty('--nav-footer-height', `${footer.offsetHeight}px`);
    };
    updateNavFooterHeightVar();
    window.addEventListener('resize', updateNavFooterHeightVar);
}

// Exit navigation mode
function exitNavigation() {
    navigationMode = false;
    // Stop location tracking
    stopLocationTracking();
    // Remove navigation footer
    const navFooter = document.getElementById('navigation-footer');
    if (navFooter) {
        navFooter.remove();
    }
    document.documentElement.style.removeProperty('--nav-footer-height');
    // Restore main content
    document.getElementById('controls').style.display = 'block';
    document.getElementById('routeInfo').style.display = 'block';
    document.getElementById('reported-issues-section').style.display = 'block';
    document.querySelector('footer').style.display = 'block';
    // Restore map container
    const mapContainer = document.getElementById('map-container');
    mapContainer.classList.remove('nav-fullscreen');
    // Restore header
    const header = document.querySelector('header');
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 18px;">
            <div>
                <h1>Kigali Traffic Navigation System</h1>
                <p>Find the best route with real-time traffic updates</p>
            </div>
            <nav style="display: flex; gap: 15px; align-items: center;">
                <a href="issue-report.html">
                    <span style="font-size: 1.2em;">⚠️</span>
                    Report an Issue
                </a>
            </nav>
        </div>
    `;
    // Trigger map resize
    google.maps.event.trigger(map, 'resize');
}

// Accurate speed calculation
let lastPosition = null;
let lastTimestamp = null;
let currentSpeed = 0;

function startLocationTracking() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser.');
        return;
    }
    locationWatcher = navigator.geolocation.watchPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            // Speed calculation
            if (lastPosition && lastTimestamp) {
                const now = Date.now();
                const dt = (now - lastTimestamp) / 1000; // seconds
                const dx = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(userLocation.lat, userLocation.lng),
                    new google.maps.LatLng(lastPosition.lat, lastPosition.lng)
                );
                // Speed in m/s, convert to km/h
                if (dt > 0) {
                    const speedKmh = (dx / dt) * 3.6;
                    // If movement is less than 1m, treat as stopped
                    currentSpeed = dx < 1 ? 0 : speedKmh;
                } else {
                    currentSpeed = 0;
                }
            } else {
                currentSpeed = 0;
            }
            lastPosition = { ...userLocation };
            lastTimestamp = Date.now();
            // Update user marker on map
            updateUserMarker(userLocation);
            // Update navigation info
            updateNavigationInfo(userLocation);
            // Check if user is on route
            checkRouteDeviation(userLocation);
        },
        (error) => {
            console.error('Error getting location:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        }
    );
}

function stopLocationTracking() {
    if (locationWatcher) {
        navigator.geolocation.clearWatch(locationWatcher);
        locationWatcher = null;
    }
    lastPosition = null;
    lastTimestamp = null;
    currentSpeed = 0;
}

// Update user marker
let userMarker = null;
function updateUserMarker(location) {
    if (userMarker) {
        userMarker.setMap(null);
    }
    
    // Create a custom marker with better visibility
    userMarker = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#2196F3',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 3
        },
        title: 'Your Location',
        zIndex: 1000
    });
    
    // Add a pulsing effect
    let pulseCount = 0;
    const pulseInterval = setInterval(() => {
        pulseCount++;
        if (pulseCount > 10) {
            clearInterval(pulseInterval);
            return;
        }
        
        const pulseMarker = new google.maps.Marker({
            position: location,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12 + (pulseCount * 2),
                fillColor: '#2196F3',
                fillOpacity: 0.3 - (pulseCount * 0.03),
                strokeColor: '#2196F3',
                strokeWeight: 1
            },
            zIndex: 999
        });
        
        setTimeout(() => {
            pulseMarker.setMap(null);
        }, 1000);
    }, 100);
}

function updateNavigationInfo(userLocation) {
    if (!currentRoute || !currentRoute.selectedRoute) return;
    
    // Calculate remaining distance and time
    const routePath = currentRoute.selectedRoute.overview_path;
    const remainingPath = calculateRemainingPath(userLocation, routePath);
    
    const totalDistance = calculateTotalDistance(routePath);
    const remainingDistance = calculateTotalDistance(remainingPath);
    const progress = ((totalDistance - remainingDistance) / totalDistance) * 100;
    const estimatedTime = calculateEstimatedTime(remainingDistance, 30); // Assume 30 km/h average speed
    
    // Update display with animations
    const distanceElement = document.getElementById('nav-distance');
    const timeElement = document.getElementById('nav-time');
    const speedElement = document.getElementById('nav-speed');
    
    // Animate distance change
    const currentDistance = distanceElement.textContent;
    const newDistance = formatDistance(remainingDistance);
    if (currentDistance !== newDistance) {
        distanceElement.style.transform = 'scale(1.1)';
        distanceElement.style.color = '#FFD700';
        setTimeout(() => {
            distanceElement.textContent = newDistance;
            distanceElement.style.transform = 'scale(1)';
            distanceElement.style.color = '#4CAF50';
        }, 150);
    }
    
    // Animate time change
    const currentTime = timeElement.textContent;
    const newTime = formatTime(estimatedTime);
    if (currentTime !== newTime) {
        timeElement.style.transform = 'scale(1.1)';
        timeElement.style.color = '#FFD700';
        setTimeout(() => {
            timeElement.textContent = newTime;
            timeElement.style.transform = 'scale(1)';
            timeElement.style.color = '#FFD700';
        }, 150);
    }
    
    // Update speed (accurate)
    speedElement.textContent = `${currentSpeed.toFixed(0)} km/h`;
    
    // Update progress indicator
    updateProgressIndicator(progress);
}

// Update progress indicator
function updateProgressIndicator(progress) {
    let progressBar = document.getElementById('nav-progress-bar');
    if (!progressBar) {
        // Create progress bar if it doesn't exist
        const footer = document.getElementById('navigation-footer');
        if (footer) {
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: rgba(255,255,255,0.2);
            `;
            
            progressBar = document.createElement('div');
            progressBar.id = 'nav-progress-bar';
            progressBar.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                transition: width 0.5s ease;
                border-radius: 2px;
            `;
            
            progressContainer.appendChild(progressBar);
            footer.appendChild(progressContainer);
        }
    }
    
    if (progressBar) {
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    }
}

// Calculate remaining path
function calculateRemainingPath(userLocation, routePath) {
    // Find the closest point on the route to user location
    let closestIndex = 0;
    let minDistance = Infinity;
    
    routePath.forEach((point, index) => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation.lat, userLocation.lng),
            point
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });
    
    // Return remaining path from closest point
    return routePath.slice(closestIndex);
}

// Calculate total distance
function calculateTotalDistance(path) {
    let totalDistance = 0;
    
    for (let i = 1; i < path.length; i++) {
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
            path[i-1],
            path[i]
        );
    }
    
    return totalDistance;
}

// Calculate estimated time
function calculateEstimatedTime(distance, averageSpeed) {
    return (distance / 1000) / averageSpeed * 60; // Convert to minutes
}

// Format distance
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    } else {
        return `${(meters / 1000).toFixed(1)} km`;
    }
}

// Format time
function formatTime(minutes) {
    if (minutes < 60) {
        return `${Math.round(minutes)} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    }
}

// Check route deviation
function checkRouteDeviation(userLocation) {
    if (!currentRoute || !currentRoute.selectedRoute) return;
    
    const routePath = currentRoute.selectedRoute.overview_path;
    const deviationDistance = findClosestDistance(userLocation, routePath);
    
    if (deviationDistance > 100) { // More than 100 meters off route
        showRouteDeviationWarning();
    }
}

// Find closest distance to route
function findClosestDistance(userLocation, routePath) {
    let minDistance = Infinity;
    
    routePath.forEach(point => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation.lat, userLocation.lng),
            point
        );
        
        if (distance < minDistance) {
            minDistance = distance;
        }
    });
    
    return minDistance;
}

// Show route deviation warning
function showRouteDeviationWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff9800;
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        z-index: 1002;
        font-weight: bold;
    `;
    warning.textContent = '⚠️ You are off route!';
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    }, 3000);
}

// Recenter map on user location
function recenterMap() {
    if (userLocation) {
        // Smooth animation to user location
        map.panTo(userLocation);
        map.setZoom(16);
        
        // Add visual feedback
        const recenterBtn = document.getElementById('recenter-btn');
        if (recenterBtn) {
            recenterBtn.innerHTML = '<span style="font-size: 1.1em;">✅</span><span>Centered</span>';
            recenterBtn.style.background = 'linear-gradient(135deg, #4CAF50, #388E3C)';
            
            setTimeout(() => {
                recenterBtn.innerHTML = '<span style="font-size: 1.1em;">📍</span><span>Recenter</span>';
                recenterBtn.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
            }, 2000);
        }
    } else {
        // If no user location, center on route
        if (currentRoute && currentRoute.selectedRoute) {
            const bounds = new google.maps.LatLngBounds();
            currentRoute.selectedRoute.overview_path.forEach(point => {
                bounds.extend(point);
            });
            map.fitBounds(bounds);
        }
    }
}

// Toggle map type (Map/Satellite)
let currentMapType = 'roadmap';
function toggleMapType() {
    const mapTypeBtn = document.getElementById('map-type-btn');
    const mapTypeText = document.getElementById('map-type-text');
    
    if (currentMapType === 'roadmap') {
        map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
        currentMapType = 'satellite';
        mapTypeText.textContent = 'Satellite';
        mapTypeBtn.innerHTML = '<span>🛰️</span><span>Satellite</span>';
    } else {
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        currentMapType = 'roadmap';
        mapTypeText.textContent = 'Map';
        mapTypeBtn.innerHTML = '<span>🗺️</span><span>Map</span>';
    }
}

// Toggle voice guidance
let voiceEnabled = true;
function toggleVoiceGuidance() {
    voiceEnabled = !voiceEnabled;
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.textContent = voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off';
    voiceBtn.style.background = voiceEnabled ? '#4CAF50' : '#666';
}

// Issues Management Functions
function toggleIssuesView() {
    const issuesContainer = document.getElementById('issues-container');
    const viewBtn = document.getElementById('view-issues-btn');
    
    // Use computed style to check visibility
    if (window.getComputedStyle(issuesContainer).display === 'none') {
        issuesContainer.style.display = 'block';
        viewBtn.innerHTML = '<span style="font-size: 1.2em;"></span> Hide Issues';
        loadIssues();
    } else {
        issuesContainer.style.display = 'none';
        viewBtn.innerHTML = '<span style="font-size: 1.2em;"></span> See Reported Issues';
    }
}

function loadIssues() {
    const issuesList = document.getElementById('issues-list');
    const issues = JSON.parse(localStorage.getItem('trafficIssues') || '[]');
    
    if (issues.length === 0) {
        issuesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 3em; margin-bottom: 20px;">📭</div>
                <h3>No Issues Reported Yet</h3>
                <p>Be the first to report a traffic issue!</p>
                <a href="issue-report.html" style="
                    display: inline-block;
                    background-color: #2196F3;
                    color: white;
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    margin-top: 15px;
                ">Report an Issue</a>
            </div>
        `;
        return;
    }
    
    // Sort issues by timestamp (newest first)
    issues.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    issuesList.innerHTML = '';
    
    issues.forEach(issue => {
        const issueElement = createIssueElement(issue);
        issuesList.appendChild(issueElement);
    });
}

function createIssueElement(issue) {
    const issueDiv = document.createElement('div');
    issueDiv.className = 'issue-item';
    issueDiv.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
        background: white;
        transition: box-shadow 0.3s ease;
    `;
    
    issueDiv.addEventListener('mouseenter', () => {
        issueDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    });
    
    issueDiv.addEventListener('mouseleave', () => {
        issueDiv.style.boxShadow = 'none';
    });
    
    const issueTypeIcon = getIssueTypeIcon(issue.type);
    const formattedDate = new Date(issue.timestamp).toLocaleString();
    
    let imageHtml = '';
    if (issue.image) {
        imageHtml = `
            <div style="margin-top: 15px;">
                <img src="${issue.image}" alt="Issue Image" style="
                    max-width: 100%;
                    max-height: 200px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                ">
            </div>
        `;
    }
    // --- Reporter email extraction logic ---
    let reporterEmail = issue.reporter;
    try {
        if (typeof reporterEmail === 'string' && reporterEmail.startsWith('{')) {
            const parsed = JSON.parse(reporterEmail);
            if (parsed.email) reporterEmail = parsed.email;
        } else if (typeof reporterEmail === 'object' && reporterEmail.email) {
            reporterEmail = reporterEmail.email;
        }
    } catch (e) {}
    // --- End reporter email extraction ---
    issueDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5em;">${issueTypeIcon}</span>
                <h3 style="margin: 0; color: #333; text-transform: capitalize;">${issue.type.replace('-', ' ')}</h3>
            </div>
            <span style="
                background-color: ${issue.status === 'solved' ? '#e8f5e8' : '#fff3e0'};
                color: ${issue.status === 'solved' ? '#388e3c' : '#f57c00'};
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: bold;
                text-transform: uppercase;
            ">${issue.status}</span>
        </div>
        
        <p style="color: #666; margin-bottom: 15px; line-height: 1.5;">${issue.description}</p>
        
        <div style="
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
        ">
            <strong>📍 Location:</strong> ${issue.location.address}
        </div>
        
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            color: #666;
        ">
            <span>👤 Reported by: ${reporterEmail}</span>
            <span>🕒 ${formattedDate}</span>
        </div>
        
        ${imageHtml}
    `;
    
    return issueDiv;
}

function getIssueTypeIcon(type) {
    const icons = {
        'traffic-jam': '🚗',
        'accident': '🚨',
        'road-closure': '🚧',
        'construction': '🏗️',
        'pothole': '🕳️',
        'flooding': '🌊',
        'broken-traffic-light': '🚦',
        'other': '⚠️'
    };
    return icons[type] || '⚠️';
}

// Initialize issues on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html';
        return;
    }
    
    // Update the report issue link to point to the correct page
    const reportLink = document.querySelector('a[href="report-issue.html"]');
    if (reportLink) {
        reportLink.href = 'issue-report.html';
    }
});

// Fallback map initialization - ensures map always renders
document.addEventListener('DOMContentLoaded', function() {
    // Check if map is initialized after a short delay
    setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement && (!map || !map.getDiv)) {
            console.log('Map not initialized, attempting to initialize...');
            if (typeof google !== 'undefined' && google.maps) {
                initMap();
            } else {
                // If Google Maps API is not loaded yet, wait a bit more
                setTimeout(() => {
                    if (typeof google !== 'undefined' && google.maps) {
                        initMap();
                    }
                }, 1000);
            }
        }
    }, 500);
});