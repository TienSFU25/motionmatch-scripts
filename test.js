const fs = require("fs");
const parseBVH = require("./bvhParser");
// const mocapLocation = "./running.bvh";
const mocapLocation = "./0007_Cartwheel001.bvh"
const header = fs.readFileSync("./runningBoilerplate.bvh", "utf-8");
const writeTo = "./running2.bvh";
const glMatrix = require("./gl-matrix/gl-matrix");
const { appendPointCloud, pointCloudToEuler, clearPointCloud, eulerToRotation, rotationToEuler } = require("./geometry");
const mocapFile = fs.readFileSync(mocapLocation, "utf-8");

let { vec3, vec4, quat, mat3 } = glMatrix;
let { atan, sin, cos, sqrt } = Math;
const DegreeToRad = 3.14 / 180;
const parsed = parseBVH(mocapFile);

let asBvh = header;

// appendPointCloud(parsed);

// const firstRawFrame = parsed.frames[0];
// const firstPointCloud = parsed.posEachFrame[0];
// const cachedFpc = JSON.parse(JSON.stringify(firstPointCloud));
// const reversedRawFrame = pointCloudToEuler(firstPointCloud, parsed.joints);
// clearPointCloud(parsed);
// parsed.frames = [reversedRawFrame];
// appendPointCloud(parsed);
// const fpc = parsed.posEachFrame[0];

// write the ordered BVH for vizzy
const frameToStr = (f) => {
    return f.join(' ');
};

// for (let i = 0; i < parsed.frames.length; i++) {
//     asBvh += frameToStr(reversedRawFrame) + '\n';
// }

let origEulers = [];
let newEulers = [];

for (let i = 0; i < parsed.frames.length; i++) {
    let frame = parsed.frames[i];
    // frame[0] -= 60;
    let rootOrientation = [frame[3] * DegreeToRad, frame[4] * DegreeToRad, frame[5] * DegreeToRad];
    let R = eulerToRotation(rootOrientation);

    ty = 0 * Math.PI / 2;
    // ty = 0;
    let Ry = mat3.clone([
        cos(ty), 0, sin(ty),
        0, 1, 0,
        -sin(ty), 0, cos(ty)
    ]);

    let newR = mat3.multiply(mat3.create(), R, Ry);
    let newRE = rotationToEuler(R);
    let [newRX, newRY, newRZ] = newRE.map(v => v / DegreeToRad);

    // translate back, rotate, forward
    newRX = 0;
    newRY = 0;
    newRZ = 0;
    frame[0] = 0;
    // frame[1] = 0;
    frame[2] = 0;
    frame[3] = newRX;
    frame[4] = newRY;
    frame[5] = newRZ;

    origEulers.push(rootOrientation);
    newEulers.push(newRE)

    asBvh += frameToStr(frame) + '\n';
}

// write to files
fs.writeFile(writeTo, asBvh, (err) => {
    if (err) {
        console.log("error in writing file");
    }

    console.log("write to file success!");
});
