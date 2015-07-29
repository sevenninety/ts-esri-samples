/// <reference path="dojo.d.ts" />
/// <reference path="arcgis-js-api.d.ts" />

import dom = require("dojo/dom");

import Map = require("esri/map");
import FeatureLayer = require("esri/layers/FeatureLayer");
import InfoTemplate = require("esri/InfoTemplate");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import SimpleFillSymbol = require("esri/symbols/SimpleFillSymbol");
import Color = require("esri/Color");
import SimpleRenderer = require("esri/renderers/SimpleRenderer");
import Circle = require("esri/geometry/Circle");
import Graphic = require("esri/graphic");
import Query = require("esri/tasks/query");

import Deferred = require("dojo/Deferred");

var map: Map = new Map("mapDiv", {
    basemap: "streets",
    center: [-95.249, 38.954],
    zoom: 14,
    slider: false
});

// Add the census block points in on demand mode. Note that an info template has been defined so when 
// Selected features are clicked a popup window will appear displaying the content defined in the info template.
var featureLayer: FeatureLayer = new FeatureLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/0", {
    infoTemplate: new InfoTemplate("Block: ${BLOCK}", "${*}"),
    outFields: ["POP2000", "HOUSEHOLDS", "HSE_UNITS", "TRACT", "BLOCK"]
});

// Selection symbol used to draw the selected census block points within the buffer polygon
var symbol: SimpleMarkerSymbol = new SimpleMarkerSymbol(
    SimpleMarkerSymbol.STYLE_CIRCLE,
    12,
    new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_NULL,
        new Color([247, 34, 101, 0.9]),
        1
        ),
    new Color([207, 34, 171, 0.5])
    );

featureLayer.setSelectionSymbol(symbol); 

// Make unselected features invisible
var nullSymbol: SimpleMarkerSymbol = new SimpleMarkerSymbol();
nullSymbol.setSize(0);

featureLayer.setRenderer(new SimpleRenderer(nullSymbol));

map.addLayer(featureLayer);

var circleSymb: SimpleFillSymbol = new SimpleFillSymbol(
    SimpleFillSymbol.STYLE_NULL,
    new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SHORTDASHDOTDOT,
        new Color([105, 105, 105]),
        2
        ), new Color([255, 255, 0, 0.25])
    );

var circle: Circle;

//when the map is clicked create a buffer around the click point of the specified distance.
map.on("click", function (evt) {
    circle = new Circle({
        center: evt.mapPoint,
        geodesic: true,
        radius: 1,
        radiusUnit: "esriMiles"
    });

    map.graphics.clear();
    map.infoWindow.hide();
    var graphic: Graphic = new Graphic(circle, circleSymb);
    map.graphics.add(graphic);

    var query: Query = new Query();
    query.geometry = circle.getExtent();

    //Use a fast bounding box query. will only go to the server if bounding box is outside of the visible map
    featureLayer.queryFeatures(query, selectInBuffer);
});

function selectInBuffer(response: any): void {
    var feature;
    var features: Graphic[] = response.features;
    var inBuffer = [];

    // Filter out features that are not actually in buffer, since we got all points in the buffer's bounding box
    features.forEach(function (feature: any) {
        if (circle.contains(feature.geometry)) {
            inBuffer.push(feature.attributes[featureLayer.objectIdField]);
        }
    });

    var query: Query = new Query();
    query.objectIds = inBuffer;

    //use a fast objectIds selection query (should not need to go to the server)
    featureLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, function (results: Graphic[]) {
        var totalPopulation: number = sumPopulation(results);
        var r: string = "<b>The total Census Block population within the buffer is <i>" + totalPopulation + "</i>.</b>";
        dom.byId("messages").innerHTML = r;
    });
}

function sumPopulation(features: Graphic[]): number {
    var popTotal: number = 0;

    features.forEach(function (feature: Graphic) {
        popTotal = popTotal + feature.attributes["POP2000"];
    });

    return popTotal;
}

