/// <reference path="arcgis-js-api.d.ts" />

import Map = require("esri/map");

var map = new Map("mapDiv", {
    basemap: "topo",
    center: [-122.45, 37.75], // longitude, latitude
    zoom: 13
});