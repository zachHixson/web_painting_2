import { ConstVector, Vector } from "./lib/Vector";
import { Mat3 } from "./lib/Mat3";
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
    private static _vao: WebGLVertexArrayObject;
    private static _planeAttrib: WGL.Attribute;
    private static _xfrmAttrib: WGL.Attribute;
    private static _matrixUniform: WGL.Uniform;

    static _shaderInit = (()=>{
        registerPrecompileCallback(gl => {
            const vs = WGL.createShader(gl, gl.VERTEX_SHADER, vertSource);
            const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, fragSource);
            const program = WGL.createProgram(gl, vs, fs);
            const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
            
            gl.bindVertexArray(vao);

            const planeGeo = WGL.createPlaneGeo().map(i => (i + 1) / 2);
            const planeGeoAttrib = new WGL.Attribute(gl, program, 'a_planeGeo');

            Mouse._ctx = gl;
            Mouse._program = program;
            Mouse._vao = vao;
            Mouse._planeAttrib = planeGeoAttrib;
            Mouse._xfrmAttrib = new WGL.Attribute(gl, program, 'a_xfrm');
            Mouse._matrixUniform = new WGL.Uniform(gl, program, 'u_viewMatrix', WGL.Uniform_Types.MAT3);

            planeGeoAttrib.set(new Float32Array(planeGeo), 2, gl.FLOAT);
            Mouse._xfrmAttrib.setDivisor(1);
            Mouse._matrixUniform.set(false, new Mat3().data);

            return true;
        });
    })();

    private readonly _camera: Camera;
    private _brushPoints: Vector[] = [];
    private _renderLength: number = 0;

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

    private _recalcGeo(): void {
        const spline = Bezier.splineFromPoints(this._brushPoints);
        const bounds = new Array<ReturnType<typeof Bezier.boundsFromCurve>>(this._brushPoints.length - 1);
        const xywhList = new Array<number>(bounds.length * 4);

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
        
        //Fill list with <px, py, width, height>
        for (let i = 0; i < bounds.length; i++){
            const box = bounds[i];
            const width = box.br.x - box.ul.x;
            const height = box.ul.y - box.br.y;
            const idx = i * 4;
            xywhList[idx + 0] = box.ul.x;
            xywhList[idx + 1] = box.br.y;
            xywhList[idx + 2] = width;
            xywhList[idx + 3] = height;
        }

        //Need to set vertex attribute for <ul.x, ul.y, width, height>
        Mouse._ctx.bindVertexArray(Mouse._vao);
        Mouse._xfrmAttrib.set(new Float32Array(xywhList), 4, Mouse._ctx.FLOAT);
        this._renderLength = bounds.length;
    }

    setTool(tool: {type: MOUSE_TOOLS, newTool?: ()=>void}): void {
        this.curTool = tool.type;
        this.createObjCallback = tool.newTool ?? null;
    }

    resize(dimensions: ConstVector): void {
        const scaleMatrix = new Mat3([
            1 / dimensions.x, 0, 0,
            0, 1 / dimensions.y, 0,
            0, 0, 1
        ]);

        Mouse._ctx.useProgram(Mouse._program);
        Mouse._matrixUniform.set(false, scaleMatrix.data);
    }

    render(): void {
        if (this._renderLength == 0) return;

        const gl = Mouse._ctx;

        gl.useProgram(Mouse._program);
        gl.bindVertexArray(Mouse._vao);

        Mouse._planeAttrib.enable();
        Mouse._xfrmAttrib.enable();

        gl.drawArraysInstanced(
            gl.TRIANGLES,
            0,
            6,
            this._renderLength
        );

        Mouse._planeAttrib.disable();
        Mouse._xfrmAttrib.disable();
    }
}