import { Vector } from "./lib/Vector";
import Camera from "./objects/Camera";
import * as WGL from './lib/wgl';
import vertSource from './shaders/mouseVertex.glsl?raw';
import fragSource from './shaders/mouseFragment.glsl?raw';
import { registerPrecompileCallback } from "./ShaderPrecompiler";
import * as Bezier from './lib/Bezier';

export enum MOUSE_TOOLS {
    MOVE = 1,
    DIRT,
    RAIN,
    WIND,
    NONE,
}

export default class Mouse {
    private static _ctx: WebGL2RenderingContext;
    private static _program: WebGLProgram;

    static _shaderInit = (()=>{
        registerPrecompileCallback(gl => {
            const vs = WGL.createShader(gl, gl.VERTEX_SHADER, vertSource);
            const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, fragSource);
            const program = WGL.createProgram(gl, vs, fs);
            Mouse._ctx = gl;
            Mouse._program = program;
            return true;
        });
    })();

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
                    this._recalcGeo();
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

    private _recalcGeo(){
        const spline = Bezier.splineFromPoints(this._brushPoints);
        const bounds = new Array<ReturnType<typeof Bezier.boundsFromCurve>>(Math.round(spline.length / 4));

        for (let i = 0; i < bounds.length; i++){
            const splineIdx = i * 3;
            const curve = [
                spline[splineIdx + 0],
                spline[splineIdx + 1],
                spline[splineIdx + 2],
                spline[splineIdx + 3]
            ];
            bounds[i] = Bezier.boundsFromCurve(curve);
        }
        
        //Need to calculate width/height
        //Need to set vertex attribute for <ul.x, ul.y, width, height>
    }

    setTool(tool: {type: MOUSE_TOOLS, newTool?: ()=>void}): void {
        this.curTool = tool.type;
        this.createObjCallback = tool.newTool ?? null;
    }

    render(): void {
        if (this._brushPoints.length == 0) return;
    }
}