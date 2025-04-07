import { state } from './main.js'
import { formatNumber } from './data.js';
import { highlightCounties, unhighlightCounties } from './map.js';

 /**
     * Create coordinated lollipop chart
     * 
     * Builds an svg chart using viewBox + margins, draws lines and circles
     * for data breaks, adds y axis and dynamic title, and links to data source
     * 
     * @param {*} csvData - parsed csv with numeric values
     * @param {*} colorScale - d3 color scale for styling breaks
     * @param {*} breaksArray - array of numeric break values
     * @param {*} expressedValues - cleaned list of values for the current variable
     */
     
    export function setChart(csvData, colorScale, breaksArray, expressedValues) {
        // get wrapper size
        const chartContainer = document.querySelector(".chart-wrapper");
        const { width, height } = chartContainer.getBoundingClientRect();
    
        // set svg and chart dimensions
        const svgWidth = width;
        const svgHeight = height;
        const margin = { top: 30, right: 0, bottom: 0, left: 40 };
        const chartInnerWidth = svgWidth - margin.left - margin.right;
        const chartInnerHeight = svgHeight - margin.top - margin.bottom;
        const translate = `translate(${margin.left},${margin.top})`;
    
        // create svg
        const svg = d3.select(".chart-wrapper")
            .append("svg")
            .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%");
    
        // background rect
        svg.append("rect")
            .attr("class", "chartBackground")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr("fill", "transparent");
    
        // inner group with margin offset
        const chart = svg.append("g")
            .attr("transform", translate);
    
        // set y scale with buffer
        const minVal = d3.min(csvData, d => d[state.expressed]);
        const maxVal = d3.max(csvData, d => d[state.expressed]);
        const buffer = (maxVal - minVal) * 0.5;
    
        const yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([minVal - buffer, maxVal + buffer]);
    
        // sort data
        csvData.sort((a, b) => b[state.expressed] - a[state.expressed]);
    
        const xScale = d3.scalePoint()
            .domain(breaksArray)
            .range([0, chartInnerWidth])
            .padding(0.5);
    
        // draw horizontal zero line
        chart.append("line")
            .attr("class", "zero-line")
            .attr("x1", 0)
            .attr("x2", chartInnerWidth)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "#999")
            .attr("stroke-dasharray", "4 2");
    
        // draw lollipop stems
        chart.selectAll(".break-line")
            .data(breaksArray)
            .enter()
            .append("line")
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d))
            .attr("y1", chartInnerHeight)
            .attr("y2", d => yScale(d))
            .attr("stroke", "#999")
            .on("mouseover", function (event, d) {
                const index = breaksArray.indexOf(d);
                const lowerBound = index === 0 ? d3.min(expressedValues) : breaksArray[index - 1];
                const upperBound = d;
                const formatDisplay = v => state.isRatioField ? `${formatNumber(v)}:1` : formatNumber(v);
    
                state.tooltip.transition().duration(200).style("opacity", 0.9);
                state.tooltip.html(`Range: ${formatDisplay(lowerBound)} – ${formatDisplay(upperBound)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
    
                highlightCounties(d);
            })
            .on("mouseout", function () {
                state.tooltip.transition().duration(200).style("opacity", 0);
                unhighlightCounties();
            });
    
        // draw lollipop circles
        chart.selectAll(".break-circle")
            .data(breaksArray)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d))
            .attr("cy", d => yScale(d))
            .attr("r", 8)
            .style("fill", d => colorScale(d))
            .each(function () { d3.select(this).raise(); })
            .on("mouseover", function (event, d) { 
                // lopp through and find break value
                const index = breaksArray.indexOf(d);
                // find break range:
                // sets lower bound of range. if first break, uses the minvalue of data. else, it uses the previous break.
                const lowerBound = index === 0 ? d3.min(expressedValues) : breaksArray[index - 1];
                // current break
                const upperBound = d;
                // helper to deal with ratios
                const formatDisplay = v => state.isRatioField ? `${formatNumber(v)}:1` : formatNumber(v);
                
                state.tooltip.transition().duration(200).style("opacity", 0.9);
                state.tooltip.html(`Range: ${formatDisplay(lowerBound)} – ${formatDisplay(upperBound)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
                // show the counties in that break range
                highlightCounties(d);
            })
            .on("mouseout", function () {
                state.tooltip.transition().duration(200).style("opacity", 0);
                unhighlightCounties();
            });
    
        // y axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d => d);
    
        chart.append("g")
            .attr("class", "axis")
            .call(yAxis);
    
        // chart frame border
        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight);
    
        // chart title
        const titleText = state.expressed;
        svg.append("text")
            .attr("class", "chartTitle")
            .attr("x", margin.left)
            .attr("y", 20)
            .attr("text-anchor", "start")
            .style("font-size", "0.75rem")
            .text(titleText);
    
        // data source link
        const leftPadding = margin.left + 10; 
        svg.append("a")
            .attr("xlink:href", "https://www.countyhealthrankings.org/health-data/wisconsin/data-and-resources")
            .attr("target", "_blank")
            .append("text")
            .attr("class", "attribution")
            .attr("x", leftPadding)   
            .attr("y", 35)
            .attr("text-anchor", "start")
            .style("font-size", "0.7rem")
            .style("fill", "#999")
            .text("Data Source");

    }