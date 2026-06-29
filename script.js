console.log("Script started");

mapboxgl.accessToken =
'pk.eyJ1IjoiZGFzZWluaG9tZWNzIiwiYSI6ImNtcXl3d3R0MjAwYXoycXF2MTNqcjFqaWIifQ.a77W_SYHwiw1Ng4d01Ma9Q';

console.log("Token set");

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [73.8567,18.5204],
    zoom:15
});

console.log("Map object created");

map.on("load", () => {
    console.log("Map loaded");
});
