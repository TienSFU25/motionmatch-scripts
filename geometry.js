const glMatrix = require("./gl-matrix/gl-matrix");
let { vec3, vec4, quat, mat3 } = glMatrix;
let { abs, atan, atan2, asin, acos, sin, cos, sqrt, PI } = Math;
const DegreeToRad = 3.14 / 180;

// 3 decimal points
const roundy = (a) => {
    return parseInt(a * 1000) / 1000;
};

const calculateJointPosRecursivelyWithQuaternion = (joint, frames) => {
    let pointCloud = joint.pointClouds[currentFrameIndex];

    // Vector4 localQuat = computeLocalQuaternion(joint);
    let localQuat = computeLocalQuaternion(joint, frames);
    pointCloud.localQuat = localQuat;

    let globalQuat = computeGlobalQuaternion(joint, localQuat);
    pointCloud.globalQuat = globalQuat;

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

const appendParentIndex = (bvh) => {
    bvh.joints.map((v, i) => v.index = i);

    const appendParentIndexRec = (joint) => {
        if (joint.parent) {
            joint.parentIndex = joint.parent.index;            
        }

        for (let i = 0; i < joint.children.length; i++)
        {
            if (joint.children[i].name)
                appendParentIndexRec(joint.children[i]);
        }
    }

    bvh.joints[0].parentIndex = null;
    appendParentIndexRec(bvh.joints[0]);
}

const clearPointCloud = (bvh) => {
    bvh.joints.map(v => v.pointClouds = undefined);
    bvh.posEachFrame = undefined;
}

const appendPointCloud = (bvh) => {
    appendParentIndex(bvh);

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

    let thisClip = {};
    for (let i = 0; i < bvh.joints.length; i++) {
        let joint = bvh.joints[i];

        thisClip[joint.name] = joint.pointClouds.map(v => {
            g = v.globalPos;
            return [g[0], g[1], g[2]]
        });
    }

    // need to "transpose"
    let numFrames = bvh.frames.length;
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

    bvh.posEachFrame = posEachFrame;
}

const nonStupidCross = (a, b) => {
    let t = vec3.create();
    return vec3.cross(t, a, b);
};

const mAdd = (a, b) => mat3.add(mat3.create(), a, b);

const rotationFromTwoVectors = (_v1, _v2) => {
    let v1 = vec3.clone(_v1);
    let v2 = vec3.clone(_v2);
    let a = vec3.normalize(vec3.create(), v1);
    let b = vec3.normalize(vec3.create(), v2);
    let c = dot(a, b);
    let v = nonStupidCross(a, b);

    const sc = (m) => {
        return [
            0, -m[2], m[1],
            m[2], 0, -m[0],
            -m[1], m[0], 0
        ];
    };

    const ssc = sc(v);
    // const ssc2 = ssc.map(v => v ** 2);
    const ssc2 = mat3.multiply(mat3.create(), ssc, ssc);

    const sscAsMat = mat3.clone(ssc);
    const ssc2AsMat = mat3.clone(ssc2);
    const eye = mat3.create();
    let t = mAdd(eye, sscAsMat);
    let R = mAdd(t, ssc2AsMat.map(v => v / (1 + c)));

    return R;
};

const eulerToRotation = (RE) => {
    let [tx, ty, tz] = RE;

    let Rx = mat3.clone([
        1, 0, 0,
        0, cos(tx), -sin(tx),
        0, sin(tx), cos(tx)
    ]);

    let Ry = mat3.clone([
        cos(ty), 0, sin(ty),
        0, 1, 0,
        -sin(ty), 0, cos(ty)
    ]);

    let Rz = mat3.clone([
        cos(tz), -sin(tz), 0,
        sin(tz), cos(tz), 0,
        0, 0, 1
    ]);

    // let _R = mat3.multiply(mat3.create(), Rx, Ry);
    // let R = mat3.multiply(mat3.create(), _R, Rz);
    let _R = mat3.multiply(mat3.create(), Rz, Ry);
    let R = mat3.multiply(mat3.create(), _R, Rx);
    return R;
};

const rotationToEuler = (_R) => {
    let Rx, Ry, Rz;

    let R = _R;
    
    if (_R.length == 9) {
        R = [
            [_R[0], _R[1], _R[2]],
            [_R[3], _R[4], _R[5]],
            [_R[6], _R[7], _R[8]]
        ];    
    }

    // if (abs(R[2][0]) != 1) {
    //     Ry = -asin(R[2][0]);
    //     Rx = atan2(R[2][1] / cos(Ry), R[2][2] / cos(Ry));
    //     Rz = atan2(R[1][0] / cos(Ry), R[0][0] / cos(Ry));
    // } else {
    //     Rz = 0;

    //     if (R[2][0] == -1) {
    //         Ry = -PI / 2;
    //         Rx = Rz + atan2(R[0][1], R[0][2]);
    //     } else {
    //         Ry = PI / 2;
    //         Rx = -Rz + atan2(-R[0][1], -R[0][2]);
    //     }
    // }

    // if (abs(R[2][0]) != 1) {
    //     ry = -asin(R[2][0]);
    //     Ry = PI - ry;
    //     Rx = atan2(R[2][1] / cos(Ry), R[2][2] / cos(Ry));
    //     Rz = atan2(R[1][0] / cos(Ry), R[0][0] / cos(Ry));
    // } else {
    //     Rz = 0;

    //     if (R[2][0] == -1) {
    //         Ry = -PI / 2;
    //         Rx = Rz + atan2(R[0][1], R[0][2]);
    //     } else {
    //         Ry = PI / 2;
    //         Rx = -Rz + atan2(-R[0][1], -R[0][2]);
    //     }
    // }

    sy = sqrt(R[0][0] * R[0][0] +  R[1][0] * R[1][0]);
    singular = sy < 1e-6;
 
    if (!singular) {
        Rx = atan2(R[2][1] , R[2][2])
        Ry = atan2(-R[2][0], sy)
        Rz = atan2(R[1][0], R[0][0])
    }
    else {
        Rx = atan2(-R[1][2], R[1][1])
        Ry = atan2(-R[2][0], sy)
        Rz = 0
    }

    // stupid euler angles...
    Ry = Math.min(Math.max(Ry, -1.4), 1.4);

    return [Rx, Ry, Rz];
};

const origin = vec3.clone([0, 0, 0]);
const yAxis = vec3.clone([0, 1, 0]);
const {dot} = vec3;

const mSub = (a, b) => {
    return a.map((v, i) => v - b[i]);
};

// (numJoints) * (3) matrix => (numJoints*3 + 3) Euler
const pointCloudToEuler = (pointCloud, joints) => {
    let asEuler = [];
    const jointOffsets = joints.map(v => v.offset);
    let jointParentIndexes = joints.map(v => v.parentIndex);

    // hip is just translation, stick it in
    asEuler = asEuler.concat(pointCloud[0]);

    const pointCloudToEulerRec = (joint) => {
        // let srcVector = jointOffsets[i];
        // let dstVector = mSub(pointCloud[i], pointCloud[jointParentIndexes[i]]);
        let parentOrientation = mat3.create();
        let thisPoint = pointCloud[joint.index];

        if (joint.parent) {
            parentOrientation = joint.parent.orientation;
        }

        let [Rx, Ry, Rz] = [0, 0, 0];

        if (joint.children.length > 0) {
            let child = joint.children[0];
            let srcVector = child.offset;
            let dstVector = mSub(pointCloud[child.index], thisPoint);
            
            let R = rotationFromTwoVectors(srcVector, dstVector);

            // Global = parent * local
            // local = parent_inv * Global
            let L = mat3.multiply(mat3.create(), mat3.invert(mat3.create(), parentOrientation), R);
            
            // store global orientation
            joint.orientation = R;
            [Rx, Ry, Rz] = rotationToEuler(L).map(v => v / DegreeToRad);
        } else {
            // unknown orientation
            [Rx, Ry, Rz] = [0, 0, 0];
        }

        // XYZ
        asEuler.push(Rx);
        asEuler.push(Ry);
        asEuler.push(Rz);

        for (let i = 0; i < joint.children.length; i++)
        {
            if (joint.children[i].name)
                pointCloudToEulerRec(joint.children[i]);
        }
    }

    pointCloudToEulerRec(joints[0]);
    
    // whatever the last joint
    // asEuler = asEuler.concat([0, 0, 0]);

    return asEuler;
};

module.exports = {
    appendPointCloud,
    clearPointCloud,
    roundy,
    nonStupidCross,
    eulerToRotation,
    rotationToEuler,
    pointCloudToEuler
};