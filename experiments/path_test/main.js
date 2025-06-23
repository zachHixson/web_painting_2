function genPath(length, startPos) {
    const buff = new Array(length);
    const curPos = [...startPos];

    for (let i = 0; i < buff.length; i++) {
        buff[i] = [...curPos, 0];
        curPos[1] += 25;
    }

    return buff
}

function updatePath(readPath, writePath) {
    for (let i = 0; i < readPath.length; i++) {
        const pt = readPath[i];
        const ptW = writePath[i];

        if (pt[0] == 0 && pt[1] == 0) {
            continue;
        }

        if (i == readPath.length - 1) {
            const halfPi = Math.PI / 2;
            const turnAmt = Math.pow(2, pt[2]) - 2 * Math.pow((pt[2] - 0.2), 2) - 1; //2^{x}-2(x-0.2)^{2}-1
            const rad = turnAmt * (Math.PI * 2);
            const vx = Math.cos(rad + halfPi);
            const vy = Math.sin(rad + halfPi);

            ptW[0] = pt[0] + vx * 2;
            ptW[1] = pt[1] + vy * 2;

            ptW[2] = pt[2] + 0.01;
        }
        else {
            const p2 = readPath[i + 1];
            const dx = p2[0] - pt[0];
            const dy = p2[1] - pt[1];
            
            ptW[0] = pt[0] + dx * 0.1;
            ptW[1] = pt[1] + dy * 0.1;
        }
    }

    //kill path if spiraling at end of spiral
    {
        const p1 = readPath[0];
        const p2 = readPath[readPath.length - 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 3) {
            for (let i = 0; i < writePath.length; i++) {
                writePath[i][0] = 0;
                writePath[i][1] = 0;
            }
        }
    }
}

function renderPath(ctx, path) {
    if (path[0][0] == 0 && path[0][1] == 0) {
        return;
    }

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        //draw line
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();

        //draw dot
        ctx.beginPath();
        ctx.arc(p1[0], p1[1], 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(path[path.length - 1][0], path[path.length - 1][1], 5, 0, Math.PI * 2);
    ctx.fill();
}

function update(env) {
    const invSwitch = 1 - env.pathSwitch;

    env.ctx.clearRect(0, 0, env.ctx.canvas.width, env.ctx.canvas.height);

    updatePath(env.path[env.pathSwitch], env.path[invSwitch]);
    env.pathSwitch = invSwitch;
    renderPath(env.ctx, env.path[env.pathSwitch]);

    requestAnimationFrame(()=>{update(env)});
}

window.onload = ()=>{
    const canvas = document.getElementById('canvas');
    const ENV = {
        ctx: canvas.getContext('2d'),
        path: [
            genPath(10, [canvas.width / 2, 0]),
            genPath(10, [canvas.width / 2, 0]),
        ],
        pathSwitch: 0,
    };
    
    update(ENV);
}