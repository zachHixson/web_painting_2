const LIFETIME = 30;

export function windPathShader(readBuffer: Array<[number, number, number]>, writeBuffer: Array<[number, number, number]>, idx: number): void {
    const curPathPt = readBuffer[idx];

    if (curPathPt[0] == 0 && curPathPt[1] == 0) {
        writeBuffer[idx][0] = 0;
        writeBuffer[idx][1] = 0;
        return;
    }

    //check if head
    if (idx % 8 == 7) {
        const SPEED = 20;
        const prevPt = readBuffer[idx - 1];
        const dir = curPathPt[2];
        writeBuffer[idx][0] = curPathPt[0] + Math.cos(dir) * SPEED;
        writeBuffer[idx][1] = curPathPt[1] + Math.sin(dir) * SPEED;
        writeBuffer[idx][2] = dir - (prevPt[2] / 50);

        //clear pt if lifetime exeeds limit (uses lifetime of previous pt)
        if (prevPt[2] > LIFETIME) {
            writeBuffer[idx][0] = 0;
            writeBuffer[idx][1] = 0;
        }

        return;
    }
    else {
        const p2 = readBuffer[idx + 1];
        const dx = p2[0] - curPathPt[0];
        const dy = p2[1] - curPathPt[1];

        writeBuffer[idx][0] = curPathPt[0] + dx * 1.2;
        writeBuffer[idx][1] = curPathPt[1] + dy * 1.2;
        writeBuffer[idx][2] = curPathPt[2] + 1;

        //clear pt if lifetime exeeds limit
        if (curPathPt[2] > LIFETIME) {
            writeBuffer[idx][0] = 0;
            writeBuffer[idx][1] = 0;
        }

        return;
    }

    //Mostly useless, but serves as nice backup while modifying above code
    writeBuffer[idx][0] = curPathPt[0];
    writeBuffer[idx][1] = curPathPt[1];
}