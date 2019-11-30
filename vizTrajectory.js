// let scale = 30;

let lowestR = 0;
let lowestL = 0;
let points = trajectory[0][0];
const baseR = 1;

const oneItemWidth = 100;
const oneItemHeight = 100;

var svg = d3.select("body").append("svg")
    .attr("width", 60000)
    .attr("height", 30000);

var line = d3.line().curve(d3.curveBasis);

let minX = 1000;
let minY = 1000;
let maxX = 0;
let maxY = 0;
let midX = 0;
let mixY = 0;

let scaleX = (maxX - minX) / oneItemWidth;
let scaleY = (maxY - minY) / oneItemHeight;

for (let p = 0; p < trajectory.length; p++) {
    for (let q = 0; q < trajectory[p].length; q++) {
        let points = trajectory[p][q];

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
}

midX = (minX + maxX) / 2;
midY = (minY + maxY) / 2;
let midXDist = maxX - midX;
let midYDist = maxY - midY;
let xDiff = maxX - minX;
let yDiff = maxY - minY;

for (let p = 0; p < trajectory.length; p++) {
    let oneClip = trajectory[p];

    for (let q = 0; q < oneClip.length; q++) {
        let points = oneClip[q];

        for (let i = 0; i < points.length; i++) {
            if (points[i][0] < lowestL) {
                lowestL = points[i][0];
            }
        
            if (points[i][1] < lowestR) {
                lowestR = points[i][1];
            }
        }
        
        let rescaledPoints = points.map(v => {
            // map this crap to [0, 1]
            let x_0 = v[0] - minX;
            let y_0 = v[1] - minY;

            return [
                x_0 * oneItemWidth / xDiff,
                y_0 * oneItemHeight / yDiff
            ];
        });
        
        var group = svg.append("g")
            .attr("transform", `translate(${q * oneItemHeight}, ${p * oneItemWidth})`);

        var opacity = (p + q) % 2 ? 0.6 : 0.3;
        group.append("rect")
            .attr("width", 100)
            .attr("height", 100)
            .attr("opacity", opacity);

        // if (p == 0 && q == 0) {
        //     var path = group.append("path")
        //     .data([[[0, 0], [50, 0], [50, 50], [50, 100], [100, 50]]])
        //     .attr("d", line);
        // } else {
            var path = group.append("path")
            .data([rescaledPoints])
            .attr("d", line);
        // }
        
        // group.selectAll(".point")
        //     .data(rescaledPoints)
        //     .enter().append("circle")
        //     .attr("r", (d, i) => (15 - i) * baseR / 15)
        //     .attr("transform", function(d) { return "translate(" + d + ")"; });                
    }
}
