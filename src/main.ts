import './style.css';
import { compileShaders } from './ShaderPrecompiler';
import Mouse from './Mouse';
import type { NewObjectCallback } from './Mouse';
import { MOUSE_TOOLS } from './Mouse';
import * as WGL from './lib/wgl';

import placeHolderIcon from '../public/vite.svg';
import btnTemplate from './button.html?raw';
import Environment from './Environment';
import Dirt from './objects/Dirt';

const tools: {
    type: MOUSE_TOOLS,
    icon: string,
    newObj?: NewObjectCallback,
}[] = [
    {
        type: MOUSE_TOOLS.MOVE,
        icon: placeHolderIcon,
    },
    {
        type: MOUSE_TOOLS.DIRT,
        icon: placeHolderIcon,
        newObj: Dirt,
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

    compileShaders(ctx).then(()=>initProgram(ctx));
}

function initProgram(ctx: WebGL2RenderingContext){
    const env = new Environment(ctx);
    env.mouse.setTool(tools[1]);
    createButtons(env.mouse);

    startUpdate(env);
}

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

function startUpdate(env: Environment): void {
    const updateCB = ()=>update(env);
    const update = (env: Environment) => {
        env.render();
        requestAnimationFrame(updateCB);
    };
    update(env);
}