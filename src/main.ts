import './style.css';
import Renderer from './Renderer';
import { compileShaders } from './ShaderPrecompiler';
import Mouse from './Mouse';
import { MOUSE_TOOLS } from './Mouse';
import * as WGL from './lib/wgl';

import placeHolderIcon from '../public/vite.svg';
import btnTemplate from './button.html?raw';
import Environment from './Environment';

const tools: {
    type: MOUSE_TOOLS,
    icon: string,
    newTool?: ()=>void,
}[] = [
    {
        type: MOUSE_TOOLS.MOVE,
        icon: placeHolderIcon,
        newTool: ()=>{},
    },
    {
        type: MOUSE_TOOLS.DIRT,
        icon: placeHolderIcon,
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
        canvas.getContext('webgl2'),
        new Error('Error creating Web GL 2 context. Please update your browser')
    );

    compileShaders(ctx).then(()=>initProgram(ctx));
}

function initProgram(ctx: WebGL2RenderingContext){
    const env = new Environment(ctx);
    const renderer = new Renderer(env.onResize);
    env.mouse.setTool(tools[1]);
    createButtons(env.mouse);

    env.resize();

    update(env, renderer);
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

        if (mouse.curTool == tools[i].type){
            btn.classList.add('tool-selected');
        }

        toolbar.appendChild(btn);
    }
}

function update(env: Environment, renderer: Renderer): void {
    renderer.render(env.renderList, env.camera.getInvMatrix());
    env.mouse.render();
    requestAnimationFrame(()=>update(env, renderer));
}