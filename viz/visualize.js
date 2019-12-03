function assert (cond, msg) {
    if (!cond) {
        throw new Error(`error: ${msg}`)
    }
}

const subsample = (matrix, factor = 2) => {
    // has to be square mat
    let h = matrix.length;
    let w = matrix[0].length;

    assert(h == w, "subsample only on square matrix bro");

    let mat = [];

    for (let i = 0; i < h - factor; i += factor) {
        let thisRow = [];
        mat.push(thisRow);

        for (let j = 0; j < h - factor; j+= factor) {
            let sumNeighbors = 0;
            
            for (let a = 0; a < factor; a++) {
                for (let b = 0; b < factor; b++) {
                    sumNeighbors += matrix[i + a][j + b];
                }
            }

            let meanNeighbors = sumNeighbors / (factor ** 2);
            thisRow.push(meanNeighbors);
        }
    }

    return mat;
}

// set the dimensions and margins of the graph
var margin = {top: 30, right: 30, bottom: 30, left: 30},
  width = 700 - margin.left - margin.right,
  height = 700 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
.append("g")
  .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

// Build color scale
var myColor = d3.scaleLinear()
  .range(["white", "#69b3a2"])
  .domain([1, biggest])

//Read the data
// d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/heatmap_data.csv", function(data) {
const data = subsample(sub, 2);

var x = d3.scaleLinear()
    .range([0, width])
    .domain([0,data[0].length]);

var y = d3.scaleLinear()
    .range([0, height])
    .domain([0,data.length]);

var row = svg.selectAll(".row")
             .data(data)
             .enter().append("svg:g")
             .attr("class", "row");

row.selectAll()
    .data(function (d,i) {return d.map(function(a){return {value: a, row: i};})})
    .enter()
    .append("rect")
    .attr("x", function(d, i) { return x(i) })
    .attr("y", function(d) { return y(d.row) })
    .attr("width", x(1) )
    .attr("height", y(1) )
    .style("fill", function(d) { return myColor(d.value)} )

// })