let bvh = parseBVH(runningBvh);
let { vec3, vec4, quat } = glMatrix;
let { sin, cos } = Math;
const DegreeToRad = 3.14 / 180;
let currentFrameIndex = 0;

let nonStupidQuatMultiply = (a, b) => {
    return quat.multiply(quat.create(), a, b);
}

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
    // Vector4 R = quaternionMultiplication(quaternionMultiplication(Rx, Ry), Rz);
    let t1 = quat.multiply(quat.create(), Rx, Ry);
    let t2 = quat.multiply(quat.create(), t1, Rz);
    // console.log(t2);

    if (Number.isNaN(t2[0])) {
        console.log("CLGT?");
    }

    // joint.LocalQuat = t2;
    return t2;
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

for (let i = 0; i < bvh.joints.length; i++) {
    bvh.joints[i].pointClouds = [];
}

rootJoint = bvh.joints[0];

for (let i = 0; i < bvh.frames.length; i++) {
    currentFrameIndex = i;

    for (let j = 0; j < bvh.joints.length; j++) {
        bvh.joints[j].pointClouds.push({
            // localPos: null,
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
