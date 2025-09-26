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

    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    const cdseUrl = "https://sh.dataspace.copernicus.eu";
    const instance = axios.create({
      baseURL: cdseUrl,
    });

    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    };

    // const fullWMSInstanceId = process.env.CLMS_SENTINEL_INSTANCE_ID;
    // const clmsByocInstanceID = process.env.CLMS_BYOC_INSTANCE_ID;
    const clmsSoilInstanceID = process.env.CLMS_SOIL_INSTANCE_ID;
    const clmsByocCollectionID = process.env.CLMS_BYOC_COLLECTION_ID;
    const ogcUrl = `${cdseUrl}/ogc/`;
    const catalogUrl = `${cdseUrl}/api/v1/catalog/1.0.0`;

    // const wmsUrl = `${ogcUrl}wms/${fullWMSInstanceId}`;
    // const wmtsUrl = `${ogcUrl}wmts/${fullWMSInstanceId}`;
    // const byocUrl = `${ogcUrl}wms/${clmsByocInstanceID}`;
    const soilUrl = `${ogcUrl}wmts/${clmsSoilInstanceID}`;
    // const wmsLayerName = "AGRICULTURE";
    // const wmtsLayerName = "FALSE_COLOR";
    // const byocHRSILayerName = "HRSI-RLIE-S1";
    // const byocPsaLayerName = "PSA";
    // const byocTestLayerName = "TEST_LAYER";
    const soilWaterIndexName = "SOIL-WATER-INDEX-SWI_EUROPE_1KM_DAILY-SWI-";
    const soilWaterIndexLayerIdArray = ["SWI010", "SWI015", "SWI020", "SWI040", "SWI060", "SWI100", "SSF", "SWI002", "SWI005", ];
    const soilMoistureName = "SURFACE-SOIL-MOISTURE-SSM_EUROPE_1KM_DAILY-SURFACE-SOIL-MOISTURE-SWI-SSF"
    let focusedCollection;
    let collectionFeatures;
    let collections;
    let dataArray;
    let timeDict = {};
  let distinctDates;
    const byocLayers = {
      names: soilWaterIndexLayerIdArray.map(indexedDB => `${soilWaterIndexName}${indexedDB}`),
      titles: soilWaterIndexLayerIdArray.map(indexedDB => `${soilWaterIndexName}${indexedDB}`),
      url: soilUrl,
    };
    byocLayers.names.push(soilMoistureName);
    byocLayers.titles.push(soilMoistureName);

    /// __________________________________________________________ F U N C T I O N S _________________________________________________________

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
        console.log("token: ",token);
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

    function getCapabilities(url) {
      const isWMTS = url.toLowerCase().includes('/wmts/');
      const getCapabilitiesUrl = isWMTS ? `${url}?SERVICE=WMTS&REQUEST=GetCapabilities` : `${url}?REQUEST=GetCapabilities`;
      return esriRequest(getCapabilitiesUrl, {
        responseType: "xml",
      }).then((response) => {
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
      });
    }

    function extractLayerData(json, key) {
      if (json && json.WMS_Capabilities && json.WMS_Capabilities.Capability && json.WMS_Capabilities.Capability.Layer) {
        let layers = json.WMS_Capabilities.Capability.Layer.Layer;
        if (Array.isArray(layers)) {
          return layers.map((l) => l[key]["#text"]);
        } else {
          return layers.Name["#text"];
        }
      } else if (json && json.Capabilities && json.Capabilities.Contents && json.Capabilities.Contents.Layer) {
        let layers = json.Capabilities.Contents.Layer;
        if (Array.isArray(layers)) {
          return layers.map((l) => {
            if (key === "Name") return l["ows:Identifier"]["#text"];
            if (key === "Title") return l["ows:Title"]["#text"];
            return null;
          });
        } else {
          if (key === "Name") return [layers["ows:Identifier"]["#text"]];
          if (key === "Title") return [layers["ows:Title"]["#text"]];
          return [];
        }
      } else {
        return [];
      }
    }

    async function prepDatasetObj(url) {
      const capabilities = await getCapabilities(url)
        .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
        .then((data) => {
          return xmlToJson(data);
        });
      const names = extractLayerData(capabilities, "Name");
      const titles = extractLayerData(capabilities, "Title");
      return {
        url,
        names,
        titles,
      };
    }

    async function getCatalogCollections() {
      const response = await instance.get(`${catalogUrl}/collections`);
      let data = response.data;
      return data.collections;
    }

    function findFocusedCollection(collectionsArr, url) {
      let focusCollection;
      if (url.includes(clmsSoilInstanceID)) {
        // focusCollection = "sentinel-2-l1c";
        focusCollection = `byoc-${clmsByocCollectionID}`;
      }
      return collectionsArr.filter(
        (collection) => collection.id === focusCollection
      );
    }

    function prepDataArray(collectionsArr) {
      return collectionsArr.map((collection) => ({
        bbox: collection.extent.spatial.bbox[0],
        datetime: `${collection.extent.temporal.interval[0][0]}/..`,
        collections: [collection.id],
        limit: 100,
        distinct: "date",
      }));
    }

    async function getCatalogEntry(body) {
      try {
        if (!instance.defaults.headers.Authorization) {
          await requestAccessToken(); //AWAIT is crucial here
        } else {
        }
        const response = await instance.post(`${catalogUrl}/search`, body);
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
        return results;
      } catch (error) {
        console.error(
          "A critical error occurred during overall processing:",
          error
        );
      }
    }

    function xmlToJson(xml) {
      var obj = {};

      if (xml.nodeType == 1) {
        if (xml.attributes.length > 0) {
          obj["@attributes"] = {};
          for (var j = 0; j < xml.attributes.length; j++) {
            var attribute = xml.attributes.item(j);
            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
        }
      } else if (xml.nodeType == 3) {
        obj = xml.nodeValue;
      }

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
    }

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
    }

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
    }

    function configureTimeSlider(layer, collectionData, features) {
      const { type, url } = layer;
      const name = layer?.activeLayer?.id
        ? layer.activeLayer.id
        : layer?.allSublayers?.items[0]?.title
        ? layer.allSublayers.items[0].title
        : null;
      function applyTimeToLayer(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${day}`;
        const timeValue = `${dateStr}T00:00:00.000Z/${dateStr}T23:59:59.999Z`;
        layer.customLayerParameters = Object.assign({}, layer.customLayerParameters, { SHOWLOGO: false, TIME: timeValue });
        layer.refresh();
      }
      if (timeSlider.timeExtent && timeSlider.timeExtent.start) {
        applyTimeToLayer(timeSlider.timeExtent.start);
      }
      timeSlider.watch("timeExtent", function () {
        if (timeSlider.timeExtent && timeSlider.timeExtent.start) {
          applyTimeToLayer(timeSlider.timeExtent.start);
        }
      });
    }

    function processMethodLayer(obj) {
      let layerObj = {};
      let { url, names, titles } = obj;
      let key;
      for (let a = 0; a < 1; a++) {
        if (url.toLowerCase().includes("wms")) {
          key = "wms";
        } else if (url.toLowerCase().includes("wmts")) {
          key = "wmts";
        }
        console.log("THE URL CREATED FOR THE REQUEST: ", url);
        switch (key) {
          case "wms":
            layerObj[a] = new WMSLayer({
              url: url,
              sublayers: names.map((name, i) => ({
                name: name,
                title: titles[i],
                visible: false,
              })),
              visible: true,
            });
            break;
          case "wmts":
            names.map((name) => {
              layerObj[name] = new WMTSLayer({
                url: soilUrl,
                style: "default",
                format: "image/png",
                tileMatrixSet: "EPSG:4326",
                tileMatrixSetID: "EPSG:4326",
                visible: false,
                activeLayer: {
                  id: name,
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

    function showLoadingText(message) {
      // Create a loading div if it doesn't exist
      let loadingDiv = document.getElementById("loadingDiv");
      if (!loadingDiv) {
        loadingDiv = document.createElement("div");
        loadingDiv.id = "loadingDiv";
        loadingDiv.style.position = "fixed";
        loadingDiv.style.top = "50%";
        loadingDiv.style.left = "50%";
        loadingDiv.style.transform = "translate(-50%, -50%)";
        loadingDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        loadingDiv.style.color = "white";
        loadingDiv.style.padding = "20px";
        loadingDiv.style.borderRadius = "5px";
        loadingDiv.style.zIndex = "1000";

        // Create spinner element
        const spinner = document.createElement("div");
        spinner.className = "spinner"; // Add spinner styles

        // Append spinner and message to loadingDiv
        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(document.createTextNode(message));

        document.body.appendChild(loadingDiv);
      } else {
        loadingDiv.innerText = message; // Update message if div already exists
      }
    }

    function hideLoadingText() {
      const loadingDiv = document.getElementById("loadingDiv");
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }

    async function fetchAndDisplayLayers() {
      showLoadingText("Loading layers, please wait...");

      try {
        const currentLayers = await fetchLayersAndData();
        map.addMany(currentLayers);
        if (distinctDates && distinctDates.length) setTimeSlider(distinctDates);
      } catch (error) {
        console.error("Error fetching layers:", error);
      } finally {
        hideLoadingText();
      }
    }

    async function fetchLayersAndData() {
      try {
        // ____________________________________________________________ Q U E R Y _______________________________________________________________

        collections = await getCatalogCollections();
        console.log("collections returned: ",   collections);
        const exampleSearchBody = {
          collections: [`byoc-${clmsByocCollectionID}`],
          datetime: "2005-07-12T00:00:00Z/2025-08-12T23:59:59Z",
          bbox: [12.44693,41.870072,12.541001,41.917096],
          limit: 10
        };
        const exampleSearchResult = await getCatalogEntry(exampleSearchBody);
        console.log("Example search result: ", exampleSearchResult);
        focusedCollection = [`byoc-${clmsByocCollectionID}`]; // Direct BYOC ID usage

        dataArray = [{
          collections: focusedCollection,
          bbox: [12.44693,41.870072,12.541001,41.917096],
          datetime: "2005-07-12T00:00:00Z/2025-08-12T23:59:59Z",
          limit: 100,
          distinct: "date"
        }];

        collectionFeatures = await processCatalogEntries(...dataArray);
  distinctDates = await fetchAllDistinctDates(dataArray[0]);

        // __________________________________________________________ L A Y E R S _______________________________________________________________
        console.log("Focused collection: ", focusedCollection);
        const layersData = await prepDatasetObj(soilUrl);
        console.log("Layers data object: ", layersData);

        // Only process the dynamic WMS data, not the hardcoded byocLayers
        const currentLayers = [processMethodLayer(layersData)].reduce((acc, set) => {
          return acc.concat(Object.values(set));
        }, []);
        console.log("Current layers: ", currentLayers);

        return currentLayers;
      } catch (error) {
        console.error("An error occurred during the process:", error);
      }
    }
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

    const timeSlider = new TimeSlider({
      container: "timeSlider",
      view: view,
      timeVisible: true,
      loop: true,
      mode: "instant",
    });

    /// ___________________________________________________________ E V E N T S ______________________________________________________________

    view.when(() => {
      fetchAndDisplayLayers();
      view.watch("updating", (isUpdating) => {
        if (!isUpdating) {
          const layerViews = view.layerViews;
          
          if (layerViews && layerViews.length !== 0) {
            layerViews.items.forEach((layer) => {
              if (layer.visible && layer.visible === true) {
                timeSlider.hidden = true;
                configureTimeSlider(
                  layer.layer,
                  focusedCollection,
                  collectionFeatures
                );
              } else {
                timeSlider.hidden = false;
              }
            });
          }
        }
      });
    });

    async function fetchAllDistinctDates(baseBody) {
      let body = Object.assign({}, baseBody);
      let dates = [];
      let guard = 0;
      while (true) {
        const r = await getCatalogEntry(body);
        if (Array.isArray(r.features)) dates = dates.concat(r.features);
        if (!r.context || r.context.next == null) break;
        body.next = r.context.next;
        guard++;
        if (guard > 50) break;
      }
      return dates;
    }

    function setTimeSlider(dateStrings) {
      if (!dateStrings.length) return;
      const sorted = dateStrings.slice().sort();
      const start = new Date(sorted[0]);
      const end = new Date(sorted[sorted.length - 1]);
      timeSlider.fullTimeExtent = new TimeExtent({ start, end });
      timeSlider.stops = { dates: sorted.map(d => new Date(d)) };
      timeSlider.timeExtent = new TimeExtent({ start: end, end: end });
    }
  }
);
