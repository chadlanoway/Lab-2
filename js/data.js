import { state } from './main.js'
import { setCounties, setMap } from './map.js';
import { setChart } from './chart.js';
 
   /**
     * Processes the loaded CSV and TopoJSON data to render the map and chart.
     *
     * Callback function to convert TopoJSON data into GeoJSON features,
     * generate a graticule, and make a color scale using Jenks or Quantile
     * classification on the "Years of Potential Life Lost Rate" field from the CSV.
     * It then draws the map elements (graticule, state boundaries, counties, and outline)
     * and finally calls the setChart function to render the coordinated bar chart.
     *
     * @param {Array} data - An array containing the following:
     *   [0]: CSV data,
     *   [1]: TopoJSON for the outline,
     *   [2]: TopoJSON for states,
     *   [3]: TopoJSON for counties.
     */
   export function callback(data) {
    let breaksArray;
    // unpack csv and topojson
    const csvData = data[0],
        outlineTopo = data[1],
        statesTopo = data[2],
        countiesTopo = data[3],
        statesGeo = topojson.feature(statesTopo, statesTopo.objects.gz_2010_us_040_00_500k),
        countiesGeo = topojson.feature(countiesTopo, countiesTopo.objects.gz_2010_us_out_counties)

    // identify numeric columns
    state.attrArray = csvData.columns.filter(col =>
        col !== "county" &&
        col !== "fips" &&
        col !== "deaths" &&
        !isNaN(+csvData[0][col].toString().replace(/,/g, '').split(":")[0])
    );

    if (!state.expressed) state.expressed = state.attrArray[0];

    // check for ratio-style values (like "2331:1")
    state.isRatioField = csvData[0][state.expressed].toString().includes(":");

    // parse values and build lookup
    state.healthByCounty = {};
    csvData.forEach(d => {
        d.rawValue = d[state.expressed];
        if (typeof d[state.expressed] === "string" && d[state.expressed].includes(":")) {
            d[state.expressed] = parseFloat(d[state.expressed].split(":")[0]);
        } else {
            d[state.expressed] = +d[state.expressed].toString().replace(/,/g, '');
        }
        state.healthByCounty[d.county] = d;
    });

    // filter and sort numeric values
    const expressedValues = csvData
        .map(d => d[state.expressed])
        .filter(v => !isNaN(v) && isFinite(v))
        .sort((a, b) => a - b);

    if (expressedValues.length < 2) {
        alert(`Not enough valid data for "${state.expressed}"`);
        throw new Error("Bad data column selected");
    }

    // create color scale and breaks
    const unique = [...new Set(expressedValues)];

    if (unique.length < 5) {
        console.warn("Too few unique values — using quantile");
        colorScale = d3.scaleQuantile()
            .domain(expressedValues)
            .range(d3.schemeReds[5]);
        breaksArray = colorScale.quantiles();
    } else {
        const numBreaks = Math.min(9, unique.length - 1);
        const rawBreaks = ss.jenks(expressedValues, numBreaks);
        breaksArray = [...new Set(rawBreaks.slice(1))];
        const numColors = breaksArray.length + 1;
        const colorRange = numColors <= 9
            ? d3.schemeReds[numColors]
            : Array.from({ length: numColors }, (_, i) =>
                d3.interpolateReds(i / (numColors - 1))
            );
        state.colorScale = d3.scaleThreshold()
            .domain(breaksArray)
            .range(colorRange);
    }

    // draw states
    state.map.append("path")
        .datum(statesGeo)
        .attr("class", "states")
        .attr("d", state.path)
        .style("stroke", "#333")
        .style("stroke-width", 0);

    // draw counties
    setCounties(countiesGeo.features, state.map, state.path, breaksArray);

    // draw chart + dropdown
    setChart(csvData, state.colorScale, breaksArray, expressedValues);
    createDropdown();
}

    /**
     * Helper function to format a number with commas and up to 2 decimal places. Used for pop up styling
     * 
     * @param {*} value 
     * @returns 
     */
    export function formatNumber(value) {
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    });
}

    /**
     * Make a dropdown menu for selecting health indicators
     * 
     * Populates options from attrArray, attaches event listener
     * to update the map and chart when selection changes
     */

    export function createDropdown() {
        const wrapper = d3.select(".dropdown-wrapper");
    
        // clear any existing dropdown
        wrapper.selectAll("*").remove();
    
        // add <select> element
        const dropdown = wrapper
            .append("select")
            .attr("class", "dropdown");
    
        // add default text option
        dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", true)
            .attr("selected", true)
            .text("2025 Wisconsin Health Indicators");
    
        // add options for each attribute
        dropdown.selectAll("option.attrOption")
            .data(state.attrArray)
            .enter()
            .append("option")
            .attr("class", "attrOption")
            .attr("value", d => d)
            .text(d => d);
    
        // update visuals when selection changes
        dropdown.on("change", function () {
            state.expressed = this.value;
            updateVis();
        });
    }    
    
    /**
     * update the map and chart when a new attribute is selected
     * 
     * clears old svg elements and re-renders everything fresh
     */

    function updateVis() {
        // clear existing chart svg
        d3.select(".chart-wrapper").selectAll("svg").remove();    
        // clear existing map svg
        d3.select(".map-wrapper").selectAll("svg").remove();
        // rebuild map (and chart via callback)
        setMap();
    }