export const PATHLENGTH = 8;

export enum ORIENTATION {
    TOP,
    CENTER,
    BOTTOM,
};

function getPathTangent(path: Array<[number, number]>, idx: number): [number, number] {
    const strokePt = path[idx];
    const nextStrokePt = path[idx + 1];
    const dx = nextStrokePt[0] - strokePt[0];
    const dy = nextStrokePt[1] - strokePt[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    const normDir = [
        dx / length,
        dy / length,
    ];

    return normDir as [number, number];
}

export function createPath(pathStartIdx: number, strokeBuffer: Array<[number, number]>): Array<[number, number, number]> {
    const pathBuffer: Array<[number, number, number]> = new Array(PATHLENGTH);
    const strokePtIdx = Math.floor(Math.random() * (strokeBuffer.length - 1));
    const strokePt = strokeBuffer[strokePtIdx];
    const tangent = getPathTangent(strokeBuffer, strokePtIdx);
    const rotTangent = [0, 0];
    const spawnAbove = !!Math.floor(Math.random() * 2);

    //rotate tangent based on spawnAbove variable
    if (spawnAbove) {
        rotTangent[0] = -tangent[1];
        rotTangent[1] = tangent[0];
    }
    else {
        rotTangent[0] = tangent[1];
        rotTangent[1] = -tangent[0];
    }

    rotTangent[0] *= 50;
    rotTangent[1] *= 50;

    //create path
    for (let i = 0; i < PATHLENGTH; i++) {
        const spacing = i * 15;

        pathBuffer[i] = [
            strokePt[0] + tangent[0] * spacing + rotTangent[0],
            strokePt[1] + tangent[1] * spacing + rotTangent[1],
            0,
        ];
    }

    pathBuffer[pathBuffer.length - 1][2] = Math.atan2(tangent[1], tangent[0]);

    return pathBuffer;
}

export function createParticle(): Array<[number, number]> {
    const pathLength = PATHLENGTH - 3;
    const buff = new Array<[number, number]>((pathLength * 6) + 6);

    //tail
    buff[0] = [
        0,
        ORIENTATION.CENTER,
    ];
    buff[1] = [
        1,
        ORIENTATION.TOP,
    ];
    buff[2] = [
        1,
        ORIENTATION.BOTTOM,
    ];

    //body
    for (let i = 0; i < pathLength; i++) {
        const ni = i * 6 + 3;

        //top tri
        buff[ni + 0] = [
            i + 1,
            ORIENTATION.BOTTOM,
        ];
        buff[ni + 1] = [
            i + 1,
            ORIENTATION.TOP,
        ];
        buff[ni + 2] = [
            i + 2,
            ORIENTATION.TOP,
        ];

        //bottom tri
        buff[ni + 3] = [
            i + 2,
            ORIENTATION.TOP,
        ];
        buff[ni + 4] = [
            i + 2,
            ORIENTATION.BOTTOM,
        ];
        buff[ni + 5] = [
            i + 1,
            ORIENTATION.BOTTOM,
        ];
    }

    //head
    buff[buff.length - 1] = [
        PATHLENGTH - 1,
        ORIENTATION.CENTER,
    ];
    buff[buff.length - 2] = [
        PATHLENGTH - 2,
        ORIENTATION.BOTTOM,
    ];
    buff[buff.length - 3] = [
        PATHLENGTH - 2,
        ORIENTATION.TOP,
    ];

    return buff;
}