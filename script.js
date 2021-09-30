require([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/2d/layers/BaseLayerView2D",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/geometry/support/webMercatorUtils",
  "esri/Graphic",

  // widgets
  "esri/widgets/Expand",
  "esri/widgets/BasemapGallery"
], function (
  Map,
  MapView,
  BaseLayerView2D,
  GraphicsLayer,
  FeatureLayer,
  webMercatorUtils,
  Graphic,

  Expand,
  BasemapGallery
) {
  var arrayOfGraphics = [];

  createPoint([48.170000000000066, -5.489999999999953]);
  createPoint([48.170000000000066, -4.9599999999999795]);

  function createPoint(coordinates) {
    arrayOfGraphics.push(
      new Graphic({
        geometry: {
          type: "point",
          longitude: coordinates[0],
          latitude: coordinates[1]
        }
      })
    );
  }

  const CustomLayerView2D = BaseLayerView2D.createSubclass({
    // implementation of render method in BaseLayerView2D
    attach: function () {
      var that = this;
      document
        .getElementById("blendsize")
        .addEventListener("change", function () {
          that.requestRender();
        });

      document
        .getElementById("transparency")
        .addEventListener("change", function () {
          that.requestRender();
        });

      document.getElementById("source").addEventListener("change", function () {
        that.requestRender();
      });
    },
    render: function (renderParameters) {
      const state = renderParameters.state;
      const ctx = renderParameters.context;
      const screenCoords = [0, 0];

      ctx.globalAlpha = document.getElementById("transparency").value;

      if (document.getElementById("source").value !== "false") {
        ctx.globalCompositeOperation = document.getElementById("source").value;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      var pointA = [0, 0];
      var pA = webMercatorUtils.lngLatToXY(
        newLayer.graphics.items[0].geometry.longitude,
        newLayer.graphics.items[0].geometry.latitude
      );

      var pointB = [0, 0];
      var pB = webMercatorUtils.lngLatToXY(
        newLayer.graphics.items[1].geometry.longitude,
        newLayer.graphics.items[1].geometry.latitude
      );

      state.toScreen(pointA, pA[0], pA[1]);
      state.toScreen(pointB, pB[0], pB[1]);
      const blendSize = document.getElementById("blendsize").value;

      const height = Math.round(pointA[1] - pointB[1]) * 2 * blendSize;
      const offset = Math.round(height / 2);

      // assumes these are all graphics with point geometies
      this.layer.graphics.forEach(function (graphic) {
        const mapCoords = webMercatorUtils.lngLatToXY(
          graphic.geometry.longitude,
          graphic.geometry.latitude
        );
        state.toScreen(screenCoords, mapCoords[0], mapCoords[1]);

        const dx = Math.round(screenCoords[0] - offset);
        const dy = Math.round(screenCoords[1] - offset);
        const temp = graphic.attributes.TEMP;

        if (temp < 44) {
          // cold
          ctx.drawImage(cold, dx, dy, height, height);
        } else if (temp < 50) {
          // mild
          //ctx.drawImage(cloud, dx, dy, width, height);
          ctx.drawImage(mild, dx, dy, height, height);
        } else {
          // hot
          ctx.drawImage(hot, dx, dy, height, height);
        }
      });
    }
  });

  const CustomLayer = GraphicsLayer.createSubclass({
    createLayerView: function (view) {
      if (view.type === "2d") {
        return new CustomLayerView2D({
          view: view,
          layer: this
        });
      }
    }
  });

  // create an instance of CustomLayer
  // with some optional properties and an initial graphic
  const customLayerInstance = new CustomLayer();

  var map = new Map({
    basemap: "streets-night-vector"
  });

  const view = new MapView({
    center: [3, 52],
    container: "viewDiv",
    map: map,
    zoom: 7
  });

  map.add(customLayerInstance);

  const featureLayer = new FeatureLayer({
    url:
      "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/weather_stations_010417/FeatureServer/0",
    outFields: ["TEMP"]
  });

  featureLayer.opacity = 0;

  map.add(featureLayer);

  var newLayer = new GraphicsLayer();
  newLayer.addMany(arrayOfGraphics);

  function addGraphics(result) {
    customLayerInstance.removeAll();
    result.features.forEach(function (feature) {
      var g = new Graphic({
        geometry: feature.geometry,
        attributes: feature.attributes
      });
      customLayerInstance.add(g);
    });
  }

  const infoDiv = document.getElementById("infoDiv");
  view.ui.add(
    new Expand({
      view: view,
      content: infoDiv,
      expandIconClass: "esri-icon-layer-list",
      expanded: true
    }),
    "top-right"
  );

  // var basemapGallery = new BasemapGallery({
  //     view: view
  // });

  // // Add the widget to the top-right corner of the view
  // view.ui.add(basemapGallery, {
  //     position: "top-left"
  // });

  view.whenLayerView(featureLayer).then(function (layerView) {
    layerView
      .queryFeatures({
        returnGeometry: true,
        outFields: ["TEMP"]
      })
      .then(function (results) {
        addGraphics(results);
      });

    layerView.watch("updating", function (value) {
      if (!value) {
        layerView
          .queryFeatures({
            returnGeometry: true,
            outFields: ["TEMP"]
          })
          .then(function (results) {
            console.log(results);
            addGraphics(results);
          });
      }
    });
  });
});
