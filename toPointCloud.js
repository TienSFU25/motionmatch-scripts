const parseBVH = require("./bvhParser");
const fs = require("fs");
const glMatrix = require("./gl-matrix/gl-matrix");

const mocapDirectory = "../HelloAnim/Assets/Resources/Subset";
const FPS = 30;
const numFramesLookahead = 15;
const writeTo = "windows/meta.json";
const trajectoryFile = "traj.js";
const smaller = "subsample.js";

let { vec3, vec4, quat } = glMatrix;
let { atan, sin, cos, sqrt } = Math;
const DegreeToRad = 3.14 / 180;
let currentFrameIndex = 0;

const nonStupidQuatMultiply = (a, b) => {
    return quat.multiply(quat.create(), a, b);
};

// 3 decimal points
const roundy = (a) => {
    return parseInt(a * 1000) / 1000;
};

const calculateJointPosRecursivelyWithQuaternion = (joint, frames) => {
    let pointCloud = joint.pointClouds[currentFrameIndex];

    // Vector4 localQuat = computeLocalQuaternion(joint);
    let localQuat = computeLocalQuaternion(joint, frames);
    pointCloud.localQuat = localQuat;

	// /*Coding Part: 2) calculate global rotation quaternion for child nodes*/
	// joint->Globalquat = computeGlobalQuaternion(joint, localQuat);
    let globalQuat = computeGlobalQuaternion(joint, localQuat);
    pointCloud.globalQuat = globalQuat;

	// /*Coding Part: 3) calculate current node's global position*/
    // Vector4 GlobalPosition = computeGlobalPosition(joint);
    let globalPos = computeGlobalPosition(joint);

    pointCloud.globalPos = globalPos;
    
    for (let i = 0; i < joint.children.length; i++)
	{
        if (joint.children[i].name)
    		calculateJointPosRecursivelyWithQuaternion(joint.children[i], frames);
	}
}

const computeLocalQuaternion = (joint, frames) => {
    let frameIndex = joint.channelOffset;

    if (joint.name == "Hips") {
        frameIndex = 3;
    }

    let x = frames[frameIndex] * DegreeToRad;
    let y = frames[frameIndex + 1] * DegreeToRad;
    let z = frames[frameIndex + 2] * DegreeToRad;

    let Rx = vec4.clone([sin(0.5 * x), 0, 0, cos(0.5 * x)]);
    let Ry = vec4.clone([0, sin(0.5 * y), 0, cos(0.5 * y)]);
    let Rz = vec4.clone([0, 0, sin(0.5 * z), cos(0.5 * z)]);

	// why not zyx?
    let t1 = quat.multiply(quat.create(), Rx, Ry);
    let R = quat.multiply(quat.create(), t1, Rz);
    return R;
}

const computeGlobalQuaternion = (joint, localQuat) => {
    if (joint.parent == null) {
        return localQuat;
    }

    let parentQuat = joint.parent.pointClouds[currentFrameIndex].globalQuat;
    let pq = quat.multiply(quat.create(), parentQuat, localQuat);

    return pq;
}

const computeGlobalPosition = (joint) => {
    let lt = joint.offset;
    let localTranslate = vec4.clone([lt[0], lt[1], lt[2], 0]);

    let globalPos;

    if (joint.parent == null) {
        // globalPos = localTranslate;
        globalPos = joint.pointClouds[currentFrameIndex].globalPos;
    } else {
        let parentPos = joint.parent.pointClouds[currentFrameIndex].globalPos;
        let parentQuat = joint.parent.pointClouds[currentFrameIndex].globalQuat;
        let parentQuatInverse = quat.clone([-parentQuat[0], -parentQuat[1], -parentQuat[2], parentQuat[3]]);

        let iden = quat.create();
        let t1 = quat.multiply(iden, parentQuat, localTranslate);
        let t2 = quat.multiply(quat.create(), t1, parentQuatInverse);
        globalPos = quat.add(iden, t2, parentPos);
    }

    return globalPos;
}

const appendPointCloud = (bvh) => {
    currentFrameIndex = 0;

    for (let i = 0; i < bvh.joints.length; i++) {
        bvh.joints[i].pointClouds = [];
    }
    
    rootJoint = bvh.joints[0];
    
    for (let i = 0; i < bvh.frames.length; i++) {
        currentFrameIndex = i;
    
        for (let j = 0; j < bvh.joints.length; j++) {
            bvh.joints[j].pointClouds.push({
                localQuat: null,
                globalQuat: null,
                globalPos: null
            });
        }
    
        // need to convert shit into point cloud
        frameData = bvh.frames[i];
        let rootPos = vec4.clone([frameData[0], frameData[1], frameData[2], 0]);
        rootJoint.pointClouds[i].globalPos = rootPos;
        
        calculateJointPosRecursivelyWithQuaternion(rootJoint, frameData);
    }
}

// let bvh = parseBVH(runningBvh);

// clip => joint * joint pos each time
const jointsCareAbout = ["LeftFoot", "RightFoot", "Spine", "Neck"];
const weights = [.25, .25, .25, .25];
mocaps = []
let biggest = 0;

fs.readdir(mocapDirectory, (err, files) => {
    files = files.filter(v => v.indexOf(".meta") < 0);
    console.log(files);
    files.forEach(file => {
        const mocapFile = fs.readFileSync(mocapDirectory + "/" + file, "utf-8");
        const parsed = parseBVH(mocapFile);

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

    // T(i, j) (trajectory match)
    const getReferencePoint = (frameData) => {
        let leftFoot = frameData[indexLeftFoot];
        let rightFoot = frameData[indexRightFoot];

        let refPoint = [((leftFoot[0] + rightFoot[0]) / 2), ((leftFoot[2] + rightFoot[2]) / 2)];
        return refPoint;
    }

    let T = [];
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
                let footOverThere = refPoints[i][j + k];
                let footDiff = [footOverThere[0] - footFromHere[0], footOverThere[1] - footFromHere[1]];
                trajectoryFromHere.push([roundy(footDiff[0]), roundy(footDiff[1])]);
            }

            thisRow.push(trajectoryFromHere);
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
        
        for (let j = 0; j < belongsTo.length; j++) {
            thisRow.push(NaN);
        }

        D.push(thisRow);

        for (let j = 0; j < cap; j++) {
            let [clipNum1, frameNum1] = belongsTo[i];
            let [clipNum2, frameNum2] = belongsTo[j];

            let srcFrame = mocaps[clipNum1].pointCloudPerFrame[frameNum1];
            let destFrame = mocaps[clipNum2].pointCloudPerFrame[frameNum2];

            // console.log("vloz");
            let df = diff(srcFrame, destFrame);
            df = roundy(df);
            D[i][j] = df;

            if (df > biggest) biggest = df;

            // symmetry
            if (i !== j) {
                D[j][i] = df;
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

    // console.log(mocaps);
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

    console.log(1);
    // debugger;
});

const origin = vec3.create([0, 0, 0]);
const diff = (frame1, frame2) => {
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