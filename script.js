mapboxgl.accessToken = 'pk.eyJ1IjoiZGFzZWluaG9tZWNzIiwiYSI6ImNtcXl3d3R0MjAwYXoycXF2MTNqcjFqaWIifQ.a77W_SYHwiw1Ng4d01Ma9Q';

// Create map
const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [73.8567, 18.5204], // Pune
    zoom: 15
});

// Zoom controls
map.addControl(new mapboxgl.NavigationControl());

// Store selected location
let selectedLocation = {
    latitude: null,
    longitude: null,
    placeName: "",
    address: ""
};

// Reverse Geocoding (Coordinates -> Address)
async function updateAddress() {
    const center = map.getCenter();

    selectedLocation.latitude = center.lat;
    selectedLocation.longitude = center.lng;

    document.getElementById("title").innerText = "Loading...";
    document.getElementById("address").innerText = "Fetching address...";

    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${center.lng},${center.lat}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            selectedLocation.placeName = data.features[0].text;
            selectedLocation.address = data.features[0].place_name;

            document.getElementById("title").innerText = selectedLocation.placeName;
            document.getElementById("address").innerText = selectedLocation.address;
        } else {
            document.getElementById("title").innerText = "Unknown Location";
            document.getElementById("address").innerText = "Address not found";
        }
    } catch (e) {
        console.error(e);
        document.getElementById("title").innerText = "Error";
        document.getElementById("address").innerText = "Unable to fetch address";
    }
}

// --- NEW FEATURE: Search / Forward Geocoding ---
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keypress", async (event) => {
    // Trigger only when user presses 'Enter'
    if (event.key === "Enter") {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            // Forward Geocoding API Request
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&proximity=${map.getCenter().lng},${map.getCenter().lat}`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const bestMatch = data.features[0];
                const [lng, lat] = bestMatch.center;

                // Move map smoothly to searched location
                map.flyTo({
                    center: [lng, lat],
                    zoom: 16,
                    essential: true
                });
            } else {
                alert("Location not found. Please try another search term.");
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    }
});

// Map Loaded
map.on("load", () => {
    updateAddress();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                map.flyTo({
                    center: [position.coords.longitude, position.coords.latitude],
                    zoom: 17,
                    essential: true
                });
            },
            (error) => {
                console.log("Location permission denied.");
            },
            { enableHighAccuracy: true }
        );
    }
});

// Update address after dragging stops
map.on("moveend", () => {
    updateAddress();
});

// --- UPDATED FEATURE: Confirm Button & Parent Redirect ---
document.getElementById("confirmBtn").addEventListener("click", () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
        alert("Please wait until a location is selected.");
        return;
    }

    // Option A: If this picker is loaded inside an <iframe> on your main site (Recommended)
    if (window.self !== window.top) {
        window.parent.postMessage({
            type: "LOCATION_SELECTED",
            data: selectedLocation
        }, "*"); // Replace '*' with your production domain name for security when live
    } 
    // Option B: If this is a direct web page redirect
    else {
        // Replace with your actual parent application URL endpoint
        const parentUrl = `https://yourparentwebsite.com/checkout?lat=${selectedLocation.latitude}&lng=${selectedLocation.longitude}&address=${encodeURIComponent(selectedLocation.address)}`;
        window.location.href = parentUrl;
    }
});
