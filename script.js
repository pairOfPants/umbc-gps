const UMBC_LAT = 39.256; //temp data
const UMBC_LON = -76.711; //temp data

function initmap() 
{
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: UMBC_LAT, lng: UMBC_LON},
        zoom: 16,
        mapId: 'MAP_ID'
        
    });

    }