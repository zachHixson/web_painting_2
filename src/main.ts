import './style.css';
import { Vector } from './lib/Vector';
import Camera from './objects/Camera';
import Renderer from './Renderer';
import Renderable from './objects/Renderable';

import placeHolderIcon from '../public/vite.svg';
import btnTemplate from './button.html?raw';

enum MOUSE_TOOLS {
    MOVE = 1,
    NONE,
}

const buttons: {
    icon: string,
    onClick: ()=>void,
}[] = [
    {
        icon: placeHolderIcon,
        onClick: ()=>{},
    },
    {
        icon: placeHolderIcon,
        onClick: ()=>{},
    },
    {
        icon: placeHolderIcon,
        onClick: ()=>{},
    },
    {
        icon: placeHolderIcon,
        onClick: ()=>{},
    },
]

const mouse = {
    curTool: MOUSE_TOOLS.NONE,
    lastPos: new Vector(0, 0),
    pos: new Vector(0, 0),
    down: false,
}
const camera = new Camera();
const objects: Renderable[] = [];
let renderer!: Renderer;

window.onload = ()=>{
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    renderer = new Renderer(canvas);

    createButtons();
    bindEventListeners(canvas);
    renderer.resize();
    camera.setDimensions(new Vector(canvas.width, canvas.height));

    update(renderer);
}

function createButtons(){
    const toolbar = document.getElementById('toolbar') as HTMLDivElement;
    const el = document.createElement('div');

    for (let i = 0; i < buttons.length; i++){
        const parsedTemplate = btnTemplate.replace('[src]', buttons[i].icon);
        el.innerHTML = parsedTemplate;
        el.firstChild!.addEventListener('click', ()=>{
            console.log(i, 'clicked');
        });
        toolbar.appendChild(el.firstChild!);
    }
}

function bindEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousemove', evt => {
        const e = evt as MouseEvent;
        mouse.lastPos.copy(mouse.pos);
        mouse.pos.set(e.offsetX, e.offsetY);

        if ((mouse.down && mouse.curTool == MOUSE_TOOLS.MOVE) || evt.buttons & 0b100){
            const delta = mouse.pos.clone().subtract(mouse.lastPos).scale(2 / camera.getScale());
            delta.x *= -1;
            camera.slide(delta);
        }
    });
    canvas.addEventListener('mousedown', e => {
        mouse.down = !!(e.buttons & 0b001);
    });
    canvas.addEventListener('mouseup', e => {
        mouse.down = !!(e.buttons & 0b001);
    });
    canvas.addEventListener('wheel', evt => {
        const e = evt as WheelEvent;
        camera.zoom(-e.deltaY / 200);
        console.log(camera.getScale());
    });
}

function update(renderer: Renderer): void {
    renderer.render(objects, camera.getInvMatrix());
    requestAnimationFrame(()=>update(renderer));
}