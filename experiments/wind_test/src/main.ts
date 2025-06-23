import { windPathShader } from "./windPathShadert";
import { windParticleVertShader } from "./windParticleVertShader";
import { PATHLENGTH, createPath, createParticle } from "./Geo";

/*
    General idea:
        - Main "stroke" is a list of points
        - On a set interval new "paths" are spawned into the pathBuffer
            - The position of each path is semi-randomly based on the stroke
            - Paths are initially straight lines, but follow the tangient of the stroke
            - "path ID" can be calculated by rounding the current idx based on the pathlength
            - The points on the path have a different "job" based on their position in the path
                - Points at the front are responsible for steering the path
                    - Values are [x, y, turn]
                    - Add random value, positive or negative, to it's "turn" amount
                    - Additionally, the more extreme the turning value, make it more extreme (to encourage a "spiral" shape)
                - Points not at front simply update themselves to move in the direction of the point in front of it multiplied by deltaT
                    - Values are [x, y, velocityAngle]
                    - Update velocityAngle after 
*/

const BUFFER_SIZE = Math.pow(128, 2);

const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
const ENV = {
    ctx: canvas.getContext('2d')!,
    strokePath: new Array<[number, number]>(),
    pathBuffer: [
        new Array<[number, number, number]>(BUFFER_SIZE),
        new Array<[number, number, number]>(BUFFER_SIZE),
    ], //front = [x, y, turn] followers = [x, y, (unused)]
    pathBufferSwitch: 0,
    particleBuffer: createParticle(), //[idx, orientation]
    vertexBuffer: new Array<[number, number]>(BUFFER_SIZE * 3),
};
const nextUpdate = ()=>{
    update(ENV);
}

function drawLine(ctx: CanvasRenderingContext2D, p1: [number, number], p2: [number, number]): void {
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
}

function drawCircle(ctx: CanvasRenderingContext2D, pt: [number, number], rad: number): void {
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
    ctx.fill();
}

function renderTriList(ctx: CanvasRenderingContext2D, vertList: Array<[number, number]>): void {
    let i = 0;

    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'blue';

    while (i < vertList.length) {
        const p1 = vertList[i++];
        const p2 = vertList[i++];
        const p3 = vertList[i++];

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
    }
}

function update(env: typeof ENV): void {
    const invPathSwitch = 1 - ENV.pathBufferSwitch;

    env.ctx.clearRect(0, 0, env.ctx.canvas.width, env.ctx.canvas.height);

    //run path compute shader
    for (let i = 0; i < BUFFER_SIZE; i++) {
        windPathShader(ENV.pathBuffer[ENV.pathBufferSwitch], ENV.pathBuffer[invPathSwitch], i);
    }

    ENV.pathBufferSwitch = invPathSwitch;

    //render stroke
    env.ctx.strokeStyle = '#DDD';
    env.ctx.fillStyle = '#DDD';

    for (let i = 0; i < env.strokePath.length - 1; i++) {
        const p1 = env.strokePath[i];
        const p2 = env.strokePath[i + 1];
        drawLine(env.ctx, p1, p2);
        drawCircle(env.ctx, p1, 5);
    }

    drawCircle(env.ctx, env.strokePath[env.strokePath.length - 1], 5);

    //render wind path
    for (let i = 0; i < env.vertexBuffer.length; i++) {
        //run vertex shader
        windParticleVertShader(
            env.particleBuffer,
            env.pathBuffer[env.pathBufferSwitch],
            env.vertexBuffer,
            i,
        );
    }
    
    renderTriList(env.ctx, env.vertexBuffer);

    requestAnimationFrame(nextUpdate);
}

//Start
(()=>{
    //init stroke
    for (let i = 0; i < 10; i++) {
        ENV.strokePath.push([
            i * 50 + 100,
            50 * Math.sin(i) + ENV.ctx.canvas.height / 2,
        ]);
    }

    //init pathBuffer
    for (let i = 0; i < BUFFER_SIZE; i++) {
        ENV.pathBuffer[0][i] = [0, 0, 0];
        ENV.pathBuffer[1][i] = [0, 0, 0];
    }

    //init vertex buffer
    for (let i = 0; i < BUFFER_SIZE * 3; i++) {
        ENV.vertexBuffer[i] = [0, 0];
    }

    const loop = setInterval(()=>{
        let idx = 0;
        let startIdx;

        //find empty space
        while (startIdx == undefined) {
            const pt = ENV.pathBuffer[ENV.pathBufferSwitch][idx];

            if (pt[0] == 0 && pt[1] == 0) {
                startIdx = idx;
            }
            else {
                idx++;
            }
        }

        //add wisp path
        const path = createPath(startIdx, ENV.strokePath);

        for (let i = 0; i < path.length; i++) {
            const pathIdx = i + startIdx;

            ENV.pathBuffer[ENV.pathBufferSwitch][pathIdx][0] = path[i][0];
            ENV.pathBuffer[ENV.pathBufferSwitch][pathIdx][1] = path[i][1];
            ENV.pathBuffer[ENV.pathBufferSwitch][pathIdx][2] = path[i][2];
        }
    }, 200);

    setTimeout(()=>{
        clearInterval(loop);
    }, 5 * 1000);

    nextUpdate();
})();

setTimeout(()=>{debugger}, 10 * 1000);