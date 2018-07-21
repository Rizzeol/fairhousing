var map = L.map( 'map', {
    center: [52.5200, 13.4050],
    minZoom: 9,
    zoom: 2
});

L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo( map );

var feURL = jQuery( 'script[src$="leaflet.js"]' ).attr( 'src' ).replace( 'leaflet.js', '' )
var icon = 
