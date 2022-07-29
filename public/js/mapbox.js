/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiZ3VydTA1IiwiYSI6ImNsNjM5MXBmZTA1Z24zYnBieXBhNzM3ZmoifQ.p0JWmF_x1IHDx8l-QBKavg";

  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/guru05/cl639zzg3000f14or8nugq3np",
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create a Marker
    const el = document.createElement("div");
    el.className = "marker";

    //Add the marker
    new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extends map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
