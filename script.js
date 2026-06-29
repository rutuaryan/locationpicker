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

// --- SEARCH & LIVE SUGGESTIONS SECTION ---
const searchInput = document.getElementById("searchInput");

// Create the suggestion container dynamically and append it right after the search input
const suggestionContainer = document.createElement("div");
suggestionContainer.id = "search-suggestions";
suggestionContainer.style.cssText = `
    position: absolute;
    background: white;
    max-height: 200px;
    overflow-y: auto;
    border-radius: 12px;
    box-shadow: 0px 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    display: none;
    margin-top: 5px;
`;
searchInput.parentNode.insertBefore(suggestionContainer, searchInput.nextSibling);

// 1. Handle explicit 'Enter' keypress search
searchInput.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
        const query = searchInput.value.trim();
        if (!query) return;

        suggestionContainer.style.display = "none";

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&proximity=${map.getCenter().lng},${map.getCenter().lat}`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const bestMatch = data.features[0];
                const [lng, lat] = bestMatch.center;

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

// 2. Handle as-you-type live suggestions
let debounceTimeout;
searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    const query = searchInput.value.trim();

    if (!query) {
        suggestionContainer.innerHTML = "";
        suggestionContainer.style.display = "none";
        return;
    }

    debounceTimeout = setTimeout(async () => {
        try {
            const center = map.getCenter();
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&proximity=${center.lng},${center.lat}&autocomplete=true&limit=5`
            );
            const data = await response.json();

            suggestionContainer.innerHTML = "";

            if (data.features && data.features.length > 0) {
                // Keep the dropdown width matching the input field precisely
                suggestionContainer.style.width = `${searchInput.getBoundingClientRect().width}px`;
                suggestionContainer.style.display = "block";

                data.features.forEach((feature) => {
                    const item = document.createElement("div");
                    item.className = "suggestion-item";
                    item.innerText = feature.place_name;
                    item.style.cssText = `
                        padding: 12px 16px;
                        cursor: pointer;
                        border-bottom: 1px solid #f0f0f0;
                        font-size: 14px;
                        color: #333;
                    `;

                    item.addEventListener("mouseenter", () => item.style.backgroundColor = "#f7f7f7");
                    item.addEventListener("mouseleave", () => item.style.backgroundColor = "transparent");

                    item.addEventListener("click", () => {
                        const [lng, lat] = feature.center;
                        searchInput.value = feature.text; 
                        suggestionContainer.style.display = "none"; 

                        map.flyTo({
                            center: [lng, lat],
                            zoom: 16,
                            essential: true
                        });
                    });

                    suggestionContainer.appendChild(item);
                });
            } else {
                suggestionContainer.style.display = "none";
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    }, 300);
});

// Close suggestions dropdown if clicking outside the elements
document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== suggestionContainer) {
        suggestionContainer.style.display = "none";
    }
});


// --- MAP LOAD & LIFECYCLE ---

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

// --- CONFIRM & REDIRECT ---
document.getElementById("confirmBtn").addEventListener("click", () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
        alert("Please wait until a location is selected.");
        return;
    }

    // Option A: If this picker is loaded inside an <iframe> on your main site
    if (window.self !== window.top) {
        window.parent.postMessage({
            type: "LOCATION_SELECTED",
            data: selectedLocation
        }, "*"); 
    } 
    // Option B: If this is a direct web page redirect
    else {
        const parentUrl = `https://yourparentwebsite.com/checkout?lat=${selectedLocation.latitude}&lng=${selectedLocation.longitude}&address=${encodeURIComponent(selectedLocation.address)}`;
        window.location.href = parentUrl;
    }
});
