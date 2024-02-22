import { Vector } from "./lib/Vector";
import Camera from "./objects/Camera";

export enum MOUSE_TOOLS {
    MOVE = 1,
    DIRT,
    RAIN,
    WIND,
    NONE,
}

export default class Mouse {
    private readonly _camera: Camera;

    curTool: MOUSE_TOOLS = MOUSE_TOOLS.NONE;
    createObjCallback: (()=>void) | null = null;
    lastPos: Vector = new Vector();
    pos: Vector = new Vector();
    down: boolean = false;

    constructor(canvas: HTMLCanvasElement, camera: Camera){
        this._camera = camera;

        canvas.addEventListener('mousemove', e => {
            this.lastPos.copy(this.pos);
            this.pos.set(e.offsetX, e.offsetY);
    
            if ((this.down && this.curTool == MOUSE_TOOLS.MOVE) || e.buttons & 0b100){
                const delta = this.pos.clone().subtract(this.lastPos).scale(2 / this._camera.getScale());
                delta.x *= -1;
                this._camera.slide(delta);
                return;
            }
        });
        canvas.addEventListener('mousedown', e => {
            this.down = !!(e.buttons & 0b001);
        });
        canvas.addEventListener('mouseup', e => {
            this.down = !!(e.buttons & 0b001);
        });
        canvas.addEventListener('wheel', e => {
            this._camera.zoom(-e.deltaY / 200);
        });
    }

    setTool(tool: {type: MOUSE_TOOLS, newTool?: ()=>void}): void {
        this.curTool = tool.type;
        this.createObjCallback = tool.newTool ?? null;
    }
}