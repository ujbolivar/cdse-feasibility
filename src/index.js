import { loadModules } from "esri-loader";
import axios from "axios";
import qs from "qs";

loadModules([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/geometry/SpatialReference",
  "esri/layers/FeatureLayer",
  "esri/layers/WMSLayer",
  "esri/layers/WMTSLayer",
  "esri/layers/support/WMTSSublayer",
  "esri/layers/TileLayer",
  "esri/layers/BaseTileLayer",
  "esri/layers/WebTileLayer",
  "esri/layers/WFSLayer",
  "esri/layers/ogc/wfsUtils",
  "esri/widgets/TimeSlider",
  "esri/widgets/TimeSlider/TimeSliderViewModel",
  "esri/TimeInterval",
  "esri/TimeExtent",
  "esri/geometry/Extent",
  "esri/widgets/Expand",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/SimpleFillSymbol",
  "esri/rest/support/TopFeaturesQuery",
  "esri/rest/support/Query",
  "esri/widgets/DirectLineMeasurement3D",
  "esri/widgets/AreaMeasurement3D",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/Graphic",
  "esri/request",
  "esri/widgets/Zoom",
]).then(
  ([
    Map,
    MapView,
    SceneView,
    SpatialReference,
    FeatureLayer,
    WMSLayer,
    WMTSLayer,
    WMTSSublayer,
    TileLayer,
    BaseTileLayer,
    WebTileLayer,
    WFSLayer,
    wfsUtils,
    TimeSlider,
    TimeSliderViewModel,
    TimeInterval,
    TimeExtent,
    Extent,
    Expand,
    Legend,
    LayerList,
    SimpleRenderer,
    SimpleFillSymbol,
    TopFeaturesQuery,
    Query,
    DirectLineMeasurement3D,
    AreaMeasurement3D,
    SimpleLineSymbol,
    Color,
    Graphic,
    esriRequest,
    Zoom,
  ]) => {
    /// ________________________________________________________ V A R I A B L E S  __________________________________________________________

    /* DO NOT USE AN INSTANCE ID THAT IS NOT YOUR OWN */
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    // Create an Axios instance for the Copernicus Data Space API
    const instance = axios.create({
      baseURL: cdseUrl,
    });

    // Configure request headers
    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    };
    const cdseUrl = "https://sh.dataspace.copernicus.eu";
    const clmsSentinelInstanceID = process.env.CLMS_SENTINEL_INSTANCE_ID;
    const clmsByocInstanceID = process.env.CLMS_BYOC_INSTANCE_ID;
    const ogcUrl = `${cdseUrl}/ogc/`;
    const catalogUrl = `${cdseUrl}/api/v1/catalog/1.0.0/search`;
    const wmsUrl = `${ogcUrl}wms/${clmsSentinelInstanceID}`;
    const wmtsUrl = `${ogcUrl}wmts/${clmsSentinelInstanceID}`;
    const byocUrl = `${ogcUrl}wms/${clmsByocInstanceID}`;
    const wmsLayerName = "AGRICULTURE";
    const wmtsLayerName = "FALSE_COLOR";
    const byocHRSILayerName = "HRSI-RLIE-S1";
    const byocPsaLayerName = "PSA";
    const byocTestLayerName = "TEST_LAYER";
    let timeDict = {};
    let processedLayers = {};
    let datasets = {
      wmsLayerName: {
        titles: [wmsLayerName],
        url: wmsUrl,
      },
      wmtsLayername: {
        titles: [wmtsLayerName],
        url: wmtsUrl,
      },
      byocTestLayerName: {
        titles: [byocHRSILayerName, byocPsaLayerName, byocTestLayerName],
        url: byocUrl,
      },
    };
    const dataArray = [
      {
        bbox: [13, 45, 14, 46],
        datetime: "2019-12-01T00:00:00Z/2020-01-01T00:00:00Z",
        collections: ["sentinel-1-grd"],
        limit: 100,
        distinct: "date",
      },
      {
        bbox: [13, 45, 14, 46],
        datetime: "2019-12-01T00:00:00Z/2020-01-01T00:00:00Z",
        collections: ["sentinel-1-grd"],
        limit: 100,
        distinct: "date",
      },
    ];

    /// __________________________________________________________ F U N C T I O N S _________________________________________________________

    // Function to request the access token
    async function requestAccessToken() {
      const body = qs.stringify({
        client_id,
        client_secret,
        grant_type: "client_credentials",
      });

      try {
        const response = await instance.post(
          "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
          body,
          config
        );
        const token = response.data.access_token;
        // Set the access token in the default headers for future requests
        instance.defaults.headers["Authorization"] = `Bearer ${token}`;
        console.log("Access token received successfully.", token);
        return token;
      } catch (error) {
        // Enhanced error handling
        const errorMessage = error.response
          ? error.response.data
          : error.message;
        console.error("Error fetching access token:", errorMessage);
        throw new Error("Failed to fetch access token");
      }
    }

    async function getCatalogEntry(body) {
      try {
        if (!instance.defaults.headers.Authorization) {
          console.log("no auth token available");
          await requestAccessToken(); //AWAIT is crucial here
        } else {
          console.log("access token available, request has been skipped.");
        }
        const response = await instance.post(catalogUrl, body);
        console.log("catalog API response: ", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching catalog entry: ", error);
        throw error;
      }
    }

    async function processCatalogEntries(...dataObjects) {
      try {
        const results = [];
        for (const dataObject of dataObjects) {
          try {
            const result = await getCatalogEntry(dataObject);
            results.push(result);
          } catch (error) {
            console.error(`Error processing data object:`, error);
            // Optionally:  Handle the error more robustly (e.g., retry, skip, etc.)
            results.push(null); // Or another indicator of failure
          }
        }
        console.table("Results:", results);
      } catch (error) {
        console.error(
          "A critical error occurred during overall processing:",
          error
        );
      }
    }

    function xmlToJson(xml) {
      // Create the return object
      var obj = {};

      if (xml.nodeType == 1) {
        // element
        // do attributes
        if (xml.attributes.length > 0) {
          obj["@attributes"] = {};
          for (var j = 0; j < xml.attributes.length; j++) {
            var attribute = xml.attributes.item(j);
            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
        }
      } else if (xml.nodeType == 3) {
        // text
        obj = xml.nodeValue;
      }

      // do children
      if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
          var item = xml.childNodes.item(i);
          var nodeName = item.nodeName;
          if (typeof obj[nodeName] == "undefined") {
            obj[nodeName] = xmlToJson(item);
          } else {
            if (typeof obj[nodeName].push === "undefined") {
              var old = obj[nodeName];
              obj[nodeName] = [];
              obj[nodeName].push(old);
            }
            obj[nodeName].push(xmlToJson(item));
          }
        }
      }
      return obj;
    }

    function getTime(url, wmtsLayerName) {
      let getCapabilitiesUrl = `${url}?SERVICE=WMTS&REQUEST=GetCapabilities`;

      return esriRequest(getCapabilitiesUrl, {
        responseType: "xml",
      })
        .then((response) => {
          // Check if the response has a status property
          if (
            response.requestOptions &&
            response.requestOptions.responseType === "xml"
          ) {
            const xmlData = response.data;

            // Convert the XML to a string
            const xmlString = new XMLSerializer().serializeToString(xmlData);

            return xmlString;
          } else {
            throw new Error("Response is not XML");
          }
        })
        .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
        .then((data) => {
          let cap = xmlToJson(data);

          let layers = cap.Capabilities.Contents.Layer;
          let layer = {};

          if (Array.isArray(layers)) {
            layer = layers.filter(
              (l) => l["ows:Title"] && ["ows:Title"]["#text"] === wmtsLayerName
            )[0];
          } else {
            layer = layers;
          }
          if (layer !== undefined && layer.hasOwnProperty("Dimension")) {
            return parserTimeDimensionWMTileS(layer.Dimension.Value);
          }
          if (cap.Capabilities && cap.Capabilities.Contents) {
            let layers = cap.Capabilities.Contents.Layer;
            let layer = {};

            if (Array.isArray(layers)) {
              layer = layers.filter(
                (l) => l["ows:Identifier"]["#text"] === wmtsLayerName
              )[0];
            } else {
              layer = layers;
            }
            if (layer.hasOwnProperty("Dimension")) {
              let dimensionValue = layer.Dimension.Value;
              if (typeof dimensionValue === "object") {
                dimensionValue = JSON.stringify(dimensionValue);
              }
              return parserTimeDimensionWMTileS(dimensionValue);
            } else {
              return false;
            }
          }
        });
    } // getTime

    function parserTimeDimensionWMTileS(timeString) {
      // [ TO CHECK ] cambiar timeString por un nombre de variable mas entendible
      if (typeof timeString === "string" && timeString.includes("/P")) {
        const [startDate, endDate, period] = timeString
          .replace(/\s/g, "")
          .split("/");
        return {
          start: startDate,
          end: endDate,
          period: period,
        };
      } else if (Array.isArray(timeString)) {
        const datesArray = timeString.map((e) => e["#text"].replace(/\s/g, ""));
        return { array: datesArray };
      }
    } // parserTimeDimensionWMTS

    function parserPeriod(iso8601Duration) {
      var iso8601DurationRegex =
        /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T?(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

      var matches = iso8601Duration.match(iso8601DurationRegex);

      return {
        sign: matches[1] === undefined ? "+" : "-",
        years: parseInt(matches[2] === undefined ? 0 : matches[2]),
        months: parseInt(matches[3] === undefined ? 0 : matches[3]),
        weeks: parseInt(matches[4] === undefined ? 0 : matches[4]),
        days: parseInt(matches[5] === undefined ? 0 : matches[5]),
        hours: parseInt(matches[6] === undefined ? 0 : matches[6]),
        minutes: parseInt(matches[7] === undefined ? 0 : matches[7]),
        seconds: parseFloat(matches[8] === undefined ? 0 : matches[8]),
      };
    } // parserPeriod

    function configureTimeSlider(layer) {
      const { type, url } = layer;
      const name = layer?.activeLayer?.id
        ? layer.activeLayer.id
        : layer?.allSublayers?.items[0]?.title
        ? layer.allSublayers.items[0].title
        : null;
      if (type === "wms") {
        return;
      } else if (type === "feature") {
        timeSlider.fullTimeExtent = layer.timeInfo.fullTimeExtent;
        timeSlider.stops = {
          interval: layer.timeInfo.interval,
        };
      } else {
        getTime(url, name).then((v) => {
          // Capabilities have time enabled
          if (v != false) {
            // Start-End-Period
            if (v && typeof v === "object" && v.hasOwnProperty("period")) {
              timeSlider.fullTimeExtent = new TimeExtent({
                /*Here the start date is hardcoded, to set the start date available in the GetCapabilities response */
                /* uncomment the following line and comment the hardcoded line */
                //start: new Date(v.start),
                start: "2024-01-01",
                end: new Date(v.end),
              });

              const period = parserPeriod(v.period);

              timeSlider.stops = {
                interval: {
                  value:
                    period.years * 365 * 24 * 60 +
                    period.months * 31 * 24 * 60 +
                    period.weeks * 7 * 24 * 60 +
                    period.days * 24 * 60 +
                    period.hours * 60 +
                    period.minutes +
                    period.seconds / 60,
                  unit: "minutes",
                },
              };
            } else if (
              v &&
              typeof v === "object" &&
              v.hasOwnProperty("array")
            ) {
              // Dates array
              timeSlider.fullTimeExtent = new TimeExtent({
                start: new Date(v.array[0]),
                end: new Date(v.array[v.array.length - 1]),
              });
              timeSlider.stops = {
                dates: v.array.map((e) => new Date(e)),
              };
              if (type === "wmts") {
                layer.customParameters = {};
                const time = v.array.map((d) => new Date(d));
                for (i in time) {
                  timeDict[time[i]] = v.array[i];
                }
              }
            }

            timeSlider.watch("timeExtent", function () {
              layer.customParameters = {
                SHOWLOGO: false,
              };
              let date;
              if (timeSlider.timeExtent.start) {
                date = timeSlider.timeExtent.start;
                let year = date.getFullYear();
                let month = String(date.getMonth() + 1).padStart(2, "0");
                let day = String(date.getDate()).padStart(2, "0");
                date = `${year}-${month}-${day}`;
              }
              layer.customParameters[
                "TIME"
              ] = `${date}T00:00:00.000Z/${date}T23:59:59.999Z`;
              layer.refresh();
            });
          } // if there is dimension time
          else {
            console.log("No time dimension");
          }
        }); // GetTime
      }
    }

    function processMethodLayer(layerObj, datasetObj) {
      let key;
      for (const i in datasetObj) {
        let url = datasetObj[i].url;
        let titles = datasetObj[i].titles;

        if (url.toLowerCase().includes("wms")) {
          key = "wms";
        } else if (url.toLowerCase().includes("wmts")) {
          key = "wmts";
        }

        switch (key) {
          case "wms":
            layerObj[i] = new WMSLayer({
              url: url,
              sublayers: titles.map((title) => ({
                name: title,
                title: title,
              })),
              visible: false,
            });
            break;
          case "wmts":
            titles.map((title) => {
              layerObj[title] = new WMTSLayer({
                url: wmtsUrl,
                style: "default",
                format: "image/png",
                tileMatrixSet: "EPSG:4326",
                tileMatrixSetID: "EPSG:4326",
                visible: false,
                activeLayer: {
                  id: title,
                },
                customLayerParameters: {
                  SHOWLOGO: false,
                },
              });
            });
            break;
          default:
            break;
        }
      }
      return layerObj;
    }

    /// __________________________________________________________ A U T H E N T I C A T I O N _______________________________________________

    // Invoke the function to request the token
    //requestAccessToken(cdseUrl).catch((err) => {
    //  console.error(err.message);
    //});

    /// __________________________________________________________ L A Y E R S _______________________________________________________________

    processMethodLayer(processedLayers, datasets);
    let currentLayers = Object.values(processedLayers).flat();
    // getTimeFromStacCatalog(wmtsLayerName);

    /// ____________________________________________________________ Q U E R Y _______________________________________________________________

    processCatalogEntries(...dataArray);

    /// ____________________________________________________________ M A P ___________________________________________________________________

    const map = new Map({
      basemap: "topo-vector",
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 10,
      center: [-3.7038, 40.4168],
    });

    map.addMany(currentLayers);

    /// ________________________________________________________ W I D G E T S _______________________________________________________________

    const layerList = new LayerList({
      view: view,
    });

    view.ui.add(layerList, {
      position: "top-left",
    });

    const legend = new Legend({
      view: view,
    });

    const legendExpand = new Expand({
      expandIconClass: "esri-icon-legend",
      expandTooltip: "Legend",
      view: view,
      content: legend,
      expanded: false,
    });

    view.ui.add(legendExpand, "top-left");

    //instantiate timeslider widget

    const timeSlider = new TimeSlider({
      container: "timeSlider",
      view: view,
      timeVisible: true,
      loop: true,
      mode: "instant",
    });

    /// ___________________________________________________________ E V E N T S ______________________________________________________________

    view.when(() => {
      view.watch("updating", (isUpdating) => {
        if (!isUpdating) {
          const layerViews = view.layerViews;
          if (layerViews && layerViews.length !== 0) {
            layerViews.items.forEach((layer) => {
              if (layer.visible && layer.visible === true) {
                timeSlider.hidden = true;
                configureTimeSlider(layer.layer);
              } else {
                timeSlider.hidden = false;
              }
            });
          }
        }
      });
    }); //When view is updated we check for available layers in the view and run the time slider configurator again
  }
);
