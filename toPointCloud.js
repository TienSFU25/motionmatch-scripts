const parseBVH = require("./bvhParser");
const dualSort = require("./utils");
const fs = require("fs");
const glMatrix = require("./gl-matrix/gl-matrix");
const { roundy, appendPointCloud } = require("./geometry");

// const mocapDirectory = "../HelloAnim/Assets/Resources/Subset";
// const mocapDirectory = "../HelloAnim/Assets/Resources/Little";
const mocapDirectory = "./sfumocap";
const boilerplateBvh = fs.readFileSync("./sfumocap/boilerplate.bvh", "utf-8");

const numFramesLookahead = 50;
const writeTo = "windows/meta.json";
const trajectoryFile = "viz/traj.js";
const smaller = "viz/subsample.js";

// some random frame to match
const frameToOrder = 600;
const framesWithTransforms = [];
const orderedBvh = "ordered.bvh";
const orderedPointClouds = [];
// const boilerplateBvh = fs.readFileSync("boilerplate.bvh", "utf-8");
// const boilerplateBvh = fs.readFileSync("runningBoilerplate.bvh", "utf-8");

let { vec3, vec4, quat } = glMatrix;
let { atan, sin, cos, sqrt } = Math;
const DegreeToRad = 3.14 / 180;
let currentFrameIndex = 0;

const nonStupidQuatMultiply = (a, b) => {
    return quat.multiply(quat.create(), a, b);
};



// let bvh = parseBVH(runningBvh);

// clip => joint * joint pos each time
const jointsCareAbout = ["LeftUpLeg", "RightUpLeg", "Hips", "RightHand", "LeftHand", "LeftFoot", "RightFoot", "Spine", "Neck"];
// const jointsCareAbout = ["Neck"];
const weights = jointsCareAbout.map(v => 1 / jointsCareAbout.length);
mocaps = []
let biggest = 0;
let rawMocaps = [];

fs.readdir(mocapDirectory, (err, files) => {
    files = files.filter(v => v.indexOf(".meta") < 0 && v.indexOf("boilerplate") < 0);
    console.log(files);
    files.forEach(file => {
        const mocapFile = fs.readFileSync(mocapDirectory + "/" + file, "utf-8");
        const parsed = parseBVH(mocapFile);
        rawMocaps.push(parsed);

        appendPointCloud(parsed);

        let thisClip = {};
        for (let i = 0; i < parsed.joints.length; i++) {
            let joint = parsed.joints[i];

            if (jointsCareAbout.indexOf(joint.name) > -1) {
                thisClip[joint.name] = joint.pointClouds.map(v => {
                    g = v.globalPos;
                    return [g[0], g[1], g[2]]
                });    
            }
        }

        // need to "transpose"
        let numFrames = parsed.frames.length;
        let posEachFrame = [];
        let jointNames = Object.keys(thisClip);

        for (let i = 0; i < numFrames; i++) {
            let thisFrame = [];
            posEachFrame.push(thisFrame);

            for (let j = 0; j < jointNames.length; j++) {
                let jointPos = thisClip[jointNames[j]][i];
                thisFrame.push(jointPos);
            }
        }
 
        // console.log(thisClip);
        mocaps.push({
            name: file,
            order: jointNames,
            frameCount: numFrames,
            pointCloudPerFrame: posEachFrame,
        });
    });

    let sharedOrder = mocaps[0].order;
    let indexLeftFoot = sharedOrder.indexOf("LeftFoot");
    let indexRightFoot = sharedOrder.indexOf("RightFoot");
    let T = [];

    if (indexLeftFoot > 0 && indexRightFoot > 0) {
        // T(i, j) (trajectory match)
        const getReferencePoint = (frameData) => {
            let leftFoot = frameData[indexLeftFoot];
            let rightFoot = frameData[indexRightFoot];

            let refPoint = [((leftFoot[0] + rightFoot[0]) / 2), ((leftFoot[2] + rightFoot[2]) / 2)];
            return refPoint;
        }

        let refPoints = [];

        // precompute where the foot is at all frames
        for (let i = 0; i < mocaps.length; i++) {
            let mocap = mocaps[i];
            let thisRow = [];
            let frames = mocap.pointCloudPerFrame;

            refPoints.push(thisRow);

            for (let j = 0; j < mocap.frameCount; j++) {
                // calc next trajectory
                // use midpoint of feet
                let thisFrame = frames[j];
                let footFromHere = getReferencePoint(thisFrame);
                thisRow.push(footFromHere);
            }
        }

        for (let i = 0; i < mocaps.length; i++) {
            let mocap = mocaps[i];
            let thisRow = [];

            T.push(thisRow);

            for (let j = 0; j < mocap.frameCount - numFramesLookahead - 1; j++) {
                // calc next trajectory
                // use midpoint of feet
                let trajectoryFromHere = [];
                let footFromHere = refPoints[i][j];

                for (let k = 1; k <= numFramesLookahead; k++) {
                    let previousFoot = refPoints[i][j + k - 1]
                    let footOverThere = refPoints[i][j + k];
                    // let footDiff = [footOverThere[0] - previousFoot[0], footOverThere[1] - previousFoot[1]];
                    let footDiff = previousFoot;
                    trajectoryFromHere.push([roundy(footDiff[0]), roundy(footDiff[1])]);
                }

                thisRow.push(trajectoryFromHere);
            }
        }
    }

    // construct our belongsTo "DP"
    belongsTo = [];

    for (let i = 0; i < mocaps.length; i++) {
        let mocapFrameCount = mocaps[i].frameCount;

        for (let j = 0; j < mocapFrameCount; j++) {
            belongsTo.push([i, j]);
        }
    }

    // D(i, j) (pose match)
    let cap = 1;
    let D = [];

    for (let i = 0; i < belongsTo.length; i++) {
        let thisRow = [];
        let [clipNum1, frameNum1] = belongsTo[i];
        let srcFrame = mocaps[clipNum1].pointCloudPerFrame[frameNum1];

        for (let j = 0; j < belongsTo.length; j++) {
            thisRow.push(NaN);
        }

        D.push(thisRow);

        if (i == frameToOrder) {
            orderedPointClouds.push(srcFrame);

            for (let k = 0; k < belongsTo.length; k++) {
                let [clipNum2, frameNum2] = belongsTo[k];
    
                let destFrame = mocaps[clipNum2].pointCloudPerFrame[frameNum2];
                let rawDestFrame = rawMocaps[clipNum2].frames[frameNum2];
                let df = diff(srcFrame, destFrame, rawDestFrame, true);
                df = roundy(df);
                D[i][k] = df;
    
                if (df > biggest) biggest = df;
            }
            var asdf = 0;
        } else {
            for (let j = 0; j < cap; j++) {
                let [clipNum2, frameNum2] = belongsTo[j];
    
                let destFrame = mocaps[clipNum2].pointCloudPerFrame[frameNum2];
                let rawDestFrame = rawMocaps[clipNum2].frames[frameNum2];
    
                // console.log("vloz");
                let df = diff(srcFrame, destFrame, rawDestFrame, false);
                df = roundy(df);
                D[i][j] = df;
    
                if (df > biggest) biggest = df;
    
                // symmetry
                if (i !== j) {
                    D[j][i] = df;
                }
            }
        }

        cap += 1;
    }

    const meta = {
        mocapOrder: mocaps.map(v => v.name),
        order: sharedOrder,
        T,
        belongsTo, 
        diffMatrix: D,
        biggest,
    };

    const sub = subsample(D);

    // write the ordered BVH for vizzy
    const frameToStr = (f) => {
        return f.join(' ');
    };

    let [clipNumber, frameNumber] = belongsTo[frameToOrder];
    let frameToMatch = rawMocaps[clipNumber].frames[frameNumber];
    let DofFrameToMatch = D[frameToOrder];
    let sortedFrames = dualSort(DofFrameToMatch, framesWithTransforms);

    let bvhAsStr = boilerplateBvh;
    bvhAsStr += `Frames: ${sortedFrames.length + 1}\n`;
    bvhAsStr += `Frame Time: 0.0333333\n`;
    bvhAsStr += frameToStr(frameToMatch) + '\n';

    for (let i = 0; i < sortedFrames.length; i++) {
        let correspondingFrame = sortedFrames[i];

        bvhAsStr += frameToStr(correspondingFrame) + '\n';
    }

    // write to files
    fs.writeFile(writeTo, JSON.stringify(meta, null, 4), (err) => {
        if (err) {
            console.log("error in writing file");
        }

        console.log("write to file success!");
    });

    fs.writeFile(trajectoryFile, `trajectory = ${JSON.stringify(T)}`, (err) => {
        if (err) {
            console.log("error in writing trajectory");
        }

        console.log("write trajectory success!");
    });

    fs.writeFile(smaller, `biggest = ${biggest}; sub = ` + JSON.stringify(sub), (err) => {
        if (err) {
            console.log("error in writing sample mat");
        }

        console.log("write sample matrix success!");
    });

    fs.writeFile(orderedBvh, bvhAsStr, (err) => {
        if (err) {
            console.log("error in writing set of frames thingy");
        }

        console.log("write set of frames success!");
    });

    console.log("done!");
    // debugger;
});

const origin = vec3.create([0, 0, 0]);
const diff = (frame1, frame2, rawFrame2, saveTransforms) => {
    assert(frame1.length == weights.length, "frame1 not equal length with weights");
    assert(frame2.length == weights.length, "frame1 not equal length with weights");

    let xBar = 0;
    let zBar = 0;
    let xBarPrime = 0;
    let zBarPrime = 0;
    let nomTerm = 0;
    let denomTerm = 0;

    for (let i = 0; i < frame1.length; i++) {
        let x_i = frame1[i][0];
        let z_i = frame1[i][2];
        let x_i_prime = frame2[i][0];
        let z_i_prime = frame2[i][2];

        xBar += weights[i] * x_i;
        zBar += weights[i] * z_i;
        xBarPrime += weights[i] * x_i_prime;
        zBarPrime += weights[i] * z_i_prime;

        // for theta
        nomTerm += weights[i] * (x_i * z_i_prime - x_i_prime * z_i);
        denomTerm += weights[i] * (x_i * x_i_prime + z_i * z_i_prime);
    }

    sumWeights = weights.reduce((p, c) => p + c, 0);
    let nomTerm2 = (xBar * zBarPrime - xBarPrime * zBar) / sumWeights;
    let denomTerm2 = (xBar * xBarPrime + zBar * zBarPrime) / sumWeights;

    let thingToArctan = (nomTerm + nomTerm2) / (denomTerm + denomTerm2);
    let theta = atan(thingToArctan);
    let x_0 = (xBar - xBarPrime*cos(theta) - zBarPrime*sin(theta)) / sumWeights;
    let z_0 = (zBar + xBarPrime*sin(theta) - zBarPrime*cos(theta)) / sumWeights;

    // transform the points in second frame
    let secondFramePoints = frame2.map(v => {
        let asVec3 = vec3.clone(v);
        let rotated = vec3.rotateY(vec3.create(), asVec3, origin, theta);
        
        rotated[0] += x_0;
        rotated[2] += z_0;

        return rotated;
    });

    if (saveTransforms) {
        let transformedFrame2 = applyTransformToRawFrame(rawFrame2, x_0, z_0, theta);
        framesWithTransforms.push(transformedFrame2);
        // framesWithTransforms.push(rawFrame2);

        orderedPointClouds.push(secondFramePoints);
    }

    let weightedDiff = frame1.map((v, i) => {
        let sf = secondFramePoints[i];
        return weights[i] * sqrt((v[0] - sf[0]) ** 2 + (v[1] - sf[1]) ** 2 + (v[2] - sf[2]) ** 2);
    });

    let sumdiff = weightedDiff.reduce((p,c) => p + c, 0);
    return sumdiff;
}

function assert (cond, msg) {
    if (!cond) {
        throw new Error(`error: ${msg}`)
    }
}

const applyTransformToRawFrame = (rawFrame, x_0, z_0, theta) => {
    let newFrame = rawFrame.map(v => v);
    newFrame[0] = 0;
    newFrame[2] = 0;
    // newFrame[3] = 0;
    // newFrame[4] = 0;
    // newFrame[5] = 0;

    return newFrame;
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