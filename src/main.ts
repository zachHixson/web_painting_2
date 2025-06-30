import './style.css';
import { TOOLS } from './Tools/Tools_Enum';
import * as WGL from './lib/wgl';

import btnTemplate from './button.html?raw';
import Environment from './Environment';

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
    const env = new Environment(ctx);
    env.setTool(TOOLS.WIND);
    createButtons(env);

    startUpdate(env);
}

/**
 * Dynamically creates HTML buttons for each tool
 */
function createButtons(env: Environment): void {
    const toolbar = document.getElementById('toolbar') as HTMLDivElement;
    const el = document.createElement('div');

    for (let i = 0; i < env.tools.length; i++){
        const parsedTemplate = btnTemplate.replace('[src]', env.tools[i].icon);
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
            env.setTool(env.tools[i].id);
        });

        if (env.curTool.id == env.tools[i].id){
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

    //document.body.append(canvas);
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