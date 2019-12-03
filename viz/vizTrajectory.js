// let points = trajectory[0][0];
const baseR = 1;

// const oneItemWidth = 100;
const totalHeight = window.innerHeight - 100;
const oneItemHeight = totalHeight / trajectory.length;
const oneItemWidth = oneItemHeight;

function scrollHorizontally(e) {
    e = window.event || e;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    this.scrollLeft -= (delta*40);
    e.preventDefault();
}

var line = d3.line().curve(d3.curveBasis);

// preprocessing shit
let longestClipLength = 0;

let minMaxPerClip = [];

for (let i = 0; i < trajectory.length; i++) {
    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    if (trajectory[i].length > longestClipLength) {
        longestClipLength = trajectory[i].length;
    }

    for (let j = 0; j < trajectory[i].length; j++) {
        let points = trajectory[i][j];

        for (let k = 0; k < points.length; k++) {
            if (points[k][0] < minX) {
                minX = points[k][0];
            }

            if (points[k][0] > maxX) {
                maxX = points[k][0];
            }

            if (points[k][1] < minY) {
                minY = points[k][1];
            }

            if (points[k][1] > maxY) {
                maxY = points[k][1];
            }
        }
    }

    let xDiff = maxX - minX;
    let yDiff = maxY - minY;

    minMaxPerClip.push({
        minX,
        minY,
        maxX,
        maxY,
        xDiff,
        yDiff
    });
}

const totalWidth = longestClipLength * oneItemWidth + 100;

var svg = d3.select("body")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", totalHeight);

svg.append("defs")
    .append("marker")
    .attr("id", "head")
    .attr("orient", "auto")
    .attr("markerWidth", 50)
    .attr("markerHeight", 100)
    .attr("refX", 1)
    .attr("refY", 2)
    .append("path")
    .attr("stroke-width", 5)
    .attr("d", 'M0,0 V4 L2,2 Z')
    .style("fill", "red")
    .attr("viewbox", "0 0 40 40")

let heatmap = svg.append("g")
    .attr("transform", "translate(20,20)");

let body = document.querySelector('body');
body.addEventListener("mousewheel", scrollHorizontally.bind(body), { passive: false });

let xDomain = [];

for (let i = 0; i < longestClipLength; i++) xDomain.push(i);

// Create the scale
var x = d3.scaleLinear()
    .domain([0, longestClipLength])
    .range([0, longestClipLength * oneItemWidth]);

// Draw the axis
svg
  .append("g")
  .attr("transform", `translate(${20 + oneItemWidth / 2},0)`)      // This controls the vertical position of the Axis
  .call(d3.axisBottom(x).ticks(longestClipLength));

for (let i = 0; i < trajectory.length; i++) {
    let oneClip = trajectory[i];
    let {minX, minY, xDiff, yDiff} = minMaxPerClip[i];
    let longerSide = Math.max(xDiff, yDiff);
    let scale = oneItemHeight / longerSide;

    for (let j = 0; j < oneClip.length; j++) {
        let points = oneClip[j];

        let rescaledPoints = points.map(v => {
            // map this crap to [0, 1]

            // at origin
            let x_0 = v[0] - minX;
            let y_0 = v[1] - minY;

            // scale
            let x_1 = x_0 * scale;
            let y_1 = y_0 * scale;

            // translate
            if (xDiff > yDiff) {
                y_1 = y_1 + (oneItemHeight - yDiff * scale) / 2;
            } else {
                x_1 = x_1 + (oneItemHeight - xDiff * scale) / 2;
            }

            // flip Y (gg svg)
            let x_2 = x_1;
            // let y_2 = oneItemHeight - y_1;
            let y_2 = y_1;
            
            return [
                x_2,
                y_2
            ];
        });
        
        var group = heatmap.append("g")
            .attr("transform", `translate(${j * oneItemHeight}, ${i * oneItemWidth})`);

        var opacity = (i + j) % 2 ? 0.6 : 0.3;
        group.append("rect")
            .attr("width", oneItemWidth)
            .attr("height", oneItemHeight)
            .attr("opacity", opacity);

        var path = group.append("path")
            .data([rescaledPoints])
            .attr("d", line)
            .attr("class", "arrow-line")
            .attr("marker-end", 'url(#head)');
    }
}
