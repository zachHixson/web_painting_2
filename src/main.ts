import './style.css';
import Mouse from './Mouse';
import type { NewObjectCallback } from './Mouse';
import { MOUSE_TOOLS } from './Mouse';
import * as WGL from './lib/wgl';

import placeHolderIcon from '/vite.svg';
import btnTemplate from './button.html?raw';
import Environment from './Environment';
import Dirt from './objects/Dirt';
import { PrecompileCallback } from './Renderer';

//create a list of objects that will be used to create the visual tool buttons
const tools: {
    type: MOUSE_TOOLS,
    icon: string,
    newObj?: NewObjectCallback,
    precompileShader?: (gl: WebGL2RenderingContext) => {id: symbol, program: WebGLProgram},
}[] = [
    {
        type: MOUSE_TOOLS.MOVE,
        icon: placeHolderIcon,
    },
    {
        type: MOUSE_TOOLS.DIRT,
        icon: placeHolderIcon,
        newObj: Dirt,
        precompileShader: Dirt.precompRenderShader,
    },
    {
        type: MOUSE_TOOLS.RAIN,
        icon: placeHolderIcon,
    },
    {
        type: MOUSE_TOOLS.WIND,
        icon: placeHolderIcon,
    },
];

window.onload = ()=>{
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = WGL.nullError(
        canvas.getContext('webgl2', {
            premultipliedAlpha: false,
        }),
        new Error('Error creating Web GL 2 context. Please update your browser')
    );

    ctx.clearColor(0, 0, 0, 0);
    ctx.enable(ctx.BLEND);
    ctx.blendFuncSeparate(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA, ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);

    createTexDebugWindow(ctx);

    initProgram(ctx);
}

/**
 * Used to start the program
 */
function initProgram(ctx: WebGL2RenderingContext){
    const precompileCallbacks: PrecompileCallback[] = [
        ...tools.map(t => t.precompileShader).filter(t => !!t),
        Mouse.precompileShader,
    ];
    const env = new Environment(ctx, precompileCallbacks);
    env.mouse.setTool(tools[1]);
    createButtons(env.mouse);

    startUpdate(env);
}

/**
 * Dynamically creates HTML buttons for each tool
 */
function createButtons(mouse: Mouse): void {
    const toolbar = document.getElementById('toolbar') as HTMLDivElement;
    const el = document.createElement('div');

    for (let i = 0; i < tools.length; i++){
        const parsedTemplate = btnTemplate.replace('[src]', tools[i].icon);
        el.innerHTML = parsedTemplate;
        const btn = el.firstChild as HTMLButtonElement;
        btn.addEventListener('click', ()=>{
            //remove 'tool-selected,' class from all buttons
            for (let i = 0; i < toolbar.childNodes.length; i++){
                const btn = toolbar.childNodes[i] as HTMLButtonElement;
                btn.classList.remove('tool-selected');
            }

            //Add class to current button and set tool
            btn.classList.add('tool-selected');
            mouse.setTool(tools[i]);
        });

        if (mouse.tool == tools[i].type){
            btn.classList.add('tool-selected');
        }

        toolbar.appendChild(btn);
    }
}

/**
 * Creates a small window for debugging textures
 */
function createTexDebugWindow(gl: WebGL2RenderingContext): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const win = window as any;
    const fb = gl.createFramebuffer();
    let debugTex: WebGLTexture | null = null;
    let imgData = new ImageData(1, 1);

    canvas.style = `
        border: 1px solid black;
        position: absolute;
        right: 0px;
    `;

    //create global functions
    win.setDebugTex = (tex: WebGLTexture, w: number, h: number) => {
        debugTex = tex;
        imgData = new ImageData(w, h);
        canvas.width = imgData.width;
        canvas.height = imgData.height;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, debugTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    win.updateDebugTex = ()=>{
        if (!debugTex) return;

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.readPixels(0, 0, imgData.width, imgData.height, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //check if empty
        // let curArr: any = [];

        // for (let i = 0; i < imgData.data.length; i++){
        //     if (imgData.data[i] != 0){
        //         curArr.push(imgData.data[i]);
        //     }
        //     else if (curArr.length > 0){
        //         console.log(curArr);
        //         curArr = [];
        //     }
        // }

        ctx.putImageData(imgData, 0, 0);
    };

    document.body.append(canvas);
}

/**
 * Starts the update/rendering cycle
 */
function startUpdate(env: Environment): void {
    const updateCB = ()=>update(env);
    const update = (env: Environment) => {
        env.update();
        env.render();
        requestAnimationFrame(updateCB);
    };
    update(env);
}