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
    private _brushPoints: Vector[] = [];

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

            if (this.down && this.curTool != MOUSE_TOOLS.MOVE){
                const curScreenPos = new Vector(e.offsetX, this._camera.getDimensions().y - e.offsetY);
                const lastPoint = this._brushPoints[this._brushPoints.length - 1];
                const distCheck = curScreenPos.distanceTo(lastPoint) > 100;
                const lengthCheck = this._brushPoints.length < 50;
                
                if (distCheck && lengthCheck) {
                    this._brushPoints.push(curScreenPos);
                    console.log(curScreenPos.toObject());
                }
            }
        });
        canvas.addEventListener('mousedown', e => {
            this.down = !!(e.buttons & 0b001);

            if (this.curTool == MOUSE_TOOLS.MOVE) return;

            if (this.down){
                this._brushPoints.push(new Vector(e.offsetX, this._camera.getDimensions().y - e.offsetY));
            }
            else{
                this._brushPoints = [];
            }
        });
        canvas.addEventListener('mouseup', e => {
            this.down = !!(e.buttons & 0b001);

            if (!this.down){
                //submit points to new object
                this._brushPoints = [];
            }
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