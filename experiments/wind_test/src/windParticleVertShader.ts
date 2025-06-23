const WIDTH = 1;

function normalize(vec: [number, number]): [number, number] {
    const length = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    return [vec[0] / length, vec[1] / length];
}

export function windParticleVertShader(particleBuffer: Array<[number, number]>, pathBuffer: Array<[number, number, number]>, writeBuffer: Array<[number, number]>, idx: number): void {
    const pt = particleBuffer[idx % particleBuffer.length];
    const pathStartIdx = Math.floor(idx / particleBuffer.length) * 8;
    const pathPtIdx = pathStartIdx + pt[0];
    const pathPt = pathBuffer[pathPtIdx];

    if (pathPt[0] == 0 && pathPt[1] == 0) {
        writeBuffer[idx][0] = 0;
        writeBuffer[idx][1] = 0;
        return;
    }

    //new
    let pathTangent = [0, 0];
    let tempTan;

    if (pt[1] != 1) {
        //node: min/max probably not needed since the first and last should always be set to "center", meaning this part wont run
        const prevPathPt = pathBuffer[Math.max(pathPtIdx - 1, 0)];
        const nextPathPt = pathBuffer[Math.min(pathPtIdx + 1, pathBuffer.length - 1)];
        const d1 = [
            pathPt[0] - prevPathPt[0],
            pathPt[1] - prevPathPt[1]
        ];
        const d2 = [
            nextPathPt[0] - pathPt[0],
            nextPathPt[1] - pathPt[1]
        ];

        pathTangent[0] = (d1[0] + d2[0]) / 2;
        pathTangent[1] = (d1[1] + d2[1]) / 2;

        pathTangent = normalize(pathTangent as [number, number]);

        //rotate path tangent
        tempTan = [...pathTangent];
        pathTangent[0] = tempTan[1];
        pathTangent[1] = tempTan[0];

        if (pt[1] == 0) {
            pathTangent[0] *= -1;
        }
        else {
            pathTangent[1] *= -1;
        }
    }
    
    //write to buffer
    writeBuffer[idx][0] = pathPt[0] + pathTangent[0] * WIDTH;
    writeBuffer[idx][1] = pathPt[1] + pathTangent[1] * WIDTH;
}