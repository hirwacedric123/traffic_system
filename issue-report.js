// Global variables
let map;
let marker;
let selectedLocation = null;
let currentLocation = null;

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
}

// Custom popup function
function showPopup(title, message, type = 'info') {
    const popupOverlay = document.getElementById('popup-overlay');
    const popupIcon = document.getElementById('popup-icon');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupButton = document.getElementById('popup-button');

    // Set icon based on type
    popupIcon.className = 'popup-icon';
    if (type === 'success') {
        popupIcon.textContent = '✓';
        popupIcon.classList.add('success');
        popupButton.className = 'popup-button success';
    } else if (type === 'error') {
        popupIcon.textContent = '✕';
        popupIcon.classList.add('error');
        popupButton.className = 'popup-button error';
    } else if (type === 'warning') {
        popupIcon.textContent = '⚠';
        popupIcon.classList.add('warning');
        popupButton.className = 'popup-button';
    } else {
        popupIcon.textContent = 'ℹ';
        popupButton.className = 'popup-button';
    }

    popupTitle.textContent = title;
    popupMessage.textContent = message;

    // Show popup
    popupOverlay.classList.add('show');

    // Handle button click
    const closePopup = () => {
        popupOverlay.classList.remove('show');
        popupButton.removeEventListener('click', closePopup);
    };

    popupButton.addEventListener('click', closePopup);

    // Close on overlay click
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Initialize Google Maps
function initMap() {
    // Default center (Kigali, Rwanda)
    const kigali = { lat: -1.9441, lng: 30.0619 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: kigali,
        mapTypeControl: false,
        streetViewControl: false
    });

    // Add click listener to map
    map.addListener('click', (event) => {
        placeMarker(event.latLng);
        getAddressFromCoordinates(event.latLng);
    });
}

// Place marker on map
function placeMarker(latLng) {
    if (marker) {
        marker.setMap(null);
    }
    
    marker = new google.maps.Marker({
        position: latLng,
        map: map,
        title: 'Selected Location'
    });
    
    selectedLocation = {
        lat: latLng.lat(),
        lng: latLng.lng()
    };
}

// Get address from coordinates
function getAddressFromCoordinates(latLng) {
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK') {
            if (results[0]) {
                document.getElementById('location-input').value = results[0].formatted_address;
            }
        } else {
            document.getElementById('location-input').value = `${latLng.lat()}, ${latLng.lng()}`;
        }
    });
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                currentLocation = pos;
                map.setCenter(pos);
                placeMarker(pos);
                getAddressFromCoordinates(pos);
                
                showPopup('Location Found', 'Your current location has been set!', 'success');
            },
            (error) => {
                console.error('Error getting location:', error);
                showPopup('Location Error', 'Unable to get your current location. Please select from map or type manually.', 'error');
            }
        );
    } else {
        showPopup('Location Error', 'Geolocation is not supported by this browser.', 'error');
    }
}

// Handle image upload and preview
function handleImageUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showPopup('File Too Large', 'Please select an image smaller than 5MB.', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

// Convert image to base64
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Submit issue report
async function submitIssue(event) {
    event.preventDefault();
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        // Get form data
        const issueType = document.getElementById('issue-type').value;
        const description = document.getElementById('issue-description').value;
        const locationInput = document.getElementById('location-input').value;
        const imageFile = document.getElementById('issue-image').files[0];
        
        // Validate required fields
        if (!issueType || !description || !locationInput) {
            showPopup('Missing Information', 'Please fill in all required fields.', 'error');
            return;
        }
        
        if (!selectedLocation) {
            showPopup('Location Required', 'Please select a location from the map or use current location.', 'error');
            return;
        }
        
        // Convert image to base64 if provided
        let imageData = null;
        if (imageFile) {
            imageData = await imageToBase64(imageFile);
        }
        
        // Create issue payload
        const issue = {
            type: issueType,
            description: description,
            location: {
                address: locationInput,
                coordinates: selectedLocation
            },
            image: imageData,
            status: 'pending'
        };

        const { response, data } = await apiRequest('/api/issues', {
            method: 'POST',
            body: JSON.stringify(issue)
        });
        if (!response.ok) {
            if (response.status === 401) {
                showPopup('Login Required', 'Please log in before reporting an issue.', 'warning');
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 1200);
                return;
            }
            showPopup('Submission Error', data.error || 'There was an error submitting your issue.', 'error');
            return;
        }
        
        showPopup('Issue Reported', 'Your traffic issue has been successfully reported!', 'success');
        
        // Reset form
        document.getElementById('issue-form').reset();
        document.getElementById('image-preview').innerHTML = '';
        if (marker) {
            marker.setMap(null);
        }
        selectedLocation = null;
        
        // Show the map again after submission
        document.getElementById('map-container').style.display = 'block';
        if (map && map.setZoom) {
            map.setZoom(12);
        }
        
    } catch (error) {
        console.error('Error submitting issue:', error);
        showPopup('Submission Error', 'There was an error submitting your issue. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Issue Report';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Require a logged-in session before allowing reporting
    apiRequest('/api/auth/me')
        .then(({ response }) => {
            if (!response.ok) {
                window.location.href = 'auth.html';
            }
        })
        .catch(() => {
            window.location.href = 'auth.html';
        });

    // Initialize map
    initMap();
    
    // Image upload
    document.getElementById('issue-image').addEventListener('change', handleImageUpload);
    
    // Location buttons
    document.getElementById('use-current-location').addEventListener('click', getCurrentLocation);
    document.getElementById('use-map-location').addEventListener('click', () => {
        document.getElementById('map-container').style.display = 'block';
        map.setZoom(12);
    });
    
    // Form submission
    document.getElementById('issue-form').addEventListener('submit', submitIssue);
    
    // Enter key support
    document.getElementById('issue-type').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('issue-description').focus();
        }
    });
    
    document.getElementById('issue-description').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            document.getElementById('issue-form').dispatchEvent(new Event('submit'));
        }
    });
    
    document.getElementById('location-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('issue-form').dispatchEvent(new Event('submit'));
        }
    });
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