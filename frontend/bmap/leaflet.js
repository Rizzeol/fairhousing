var map = L.map( 'map', {
    center: [52.5200, 13.4050],
    minZoom: 9,
    zoom: 2
});

L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo( map );

var myURL = jQuery( 'script[src$="leaflet.js"]' ).attr( 'src' ).replace( 'leaflet.js', '' );


var myIcon = L.icon({
  iconUrl: 'img/pin24.png',
  iconRetinaUrl: 'img/pin48.png',
  iconSize: [29, 24],
  iconAnchor: [9, 21],
  popupAnchor: [0, -14]
})

var tableacc = "";


for ( var i=0; i < markers.length; ++i )
{
 L.marker( [markers[i].lat, markers[i].lng], {icon: myIcon} )
  .bindPopup( '<a href="' + markers[i].url + '" target="_blank">' + markers[i].address +  '</a>' )
  .addTo( map );

 tableacc += "<tr> <td>" + markers[i].address + " </td> </tr>"
}

document.getElementById("area").innerHTML = tableacc;