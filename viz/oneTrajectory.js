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
trajectory = trajectory[3];

let minX = 1000;
let minY = 1000;
let maxX = 0;
let maxY = 0;

for (let j = 0; j < trajectory.length; j++) {
    let points = trajectory[j];

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
let longerSide = Math.max(xDiff, yDiff);
let scale = oneItemHeight / longerSide;

const totalWidth = trajectory.length * oneItemWidth + 100;

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

let box = svg.append("g")
    .attr("transform", "translate(20,20)")

box.append("rect")
    .attr("width", oneItemWidth)
    .attr("height", oneItemHeight)
    .attr("opacity", 0.3)

let trajectoryLine = box.append("path")
    .attr("class", "arrow-line")
    .attr("marker-end", 'url(#head)');

let body = document.querySelector('body');
    body.addEventListener("mousewheel", scrollHorizontally.bind(body), { passive: false });

let i = 0;

let displayFrame = () => {
    let points = trajectory[i];

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
    
    trajectoryLine.data([rescaledPoints]).attr("d", line);
    i += 1;

    setTimeout(displayFrame, 10);
};

setTimeout(displayFrame, 10);
