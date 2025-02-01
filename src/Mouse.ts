import { ConstVector, Vector } from "./lib/Vector";
import { Mat3 } from "./lib/Mat3";
import Camera from "./Camera";
import * as WGL from './lib/wgl';
import vertSource from './shaders/mouseVertex.glsl?raw';
import fragSource from './shaders/mouseFragment.glsl?raw';
import * as Bezier from './lib/Bezier';
import EventEmitter from "./lib/EventEmitter";
import Object_Base from "./objects/Object_Base";
import RenderPass from "./lib/RenderPass";
import Environment from "./Environment";

const RENDER_PROGRAM_ID = Symbol('MOUSE');

export enum MOUSE_TOOLS {
    MOVE = 1,
    DIRT,
    RAIN,
    WIND,
    NONE,
}

export type NewObjectCallback = new (...args: ConstructorParameters<typeof Object_Base>)=>Object_Base;

export default class Mouse {
    static precompileShader(gl: WebGL2RenderingContext): { id: symbol, program: WebGLProgram } {
        const vs = WGL.createShader(gl, gl.VERTEX_SHADER, vertSource);
        const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, fragSource);
        const program = WGL.createProgram(gl, vs, fs);

        return { id: RENDER_PROGRAM_ID, program };
    }

    private readonly _camera: Camera;
    private _curTool: MOUSE_TOOLS = MOUSE_TOOLS.NONE;
    private _lastPos: Vector = new Vector();
    private _pos: Vector = new Vector();
    private _down: boolean = false;
    private _createObjCallback: (NewObjectCallback) | null = null;
    private _brushPoints: Vector[] = [];
    private _splinePoints: Vector[] = [];
    private _renderLength: number = 0;
    private _renderPass: RenderPass;

    readonly onCommit = new EventEmitter<(createObj: NewObjectCallback, points: Vector[])=>void>();

    constructor(env: Environment, camera: Camera, onResize: EventEmitter<(dimensions: ConstVector)=>void>){
        const canvas = env.ctx.canvas as HTMLCanvasElement;
        this._camera = camera;
        this._renderPass = this._setupRenderPass(env);

        canvas.addEventListener('mousemove', e => {
            this._lastPos.copy(this._pos);
            this._pos.set(e.offsetX, e.offsetY);
    
            if ((this._down && this._curTool == MOUSE_TOOLS.MOVE) || e.buttons & 0b100){
                const delta = this._pos.clone().subtract(this._lastPos).scale(2 / this._camera.getScale());
                delta.x *= -1;
                this._camera.slide(delta);
                return;
            }

            if (this._down && this._curTool != MOUSE_TOOLS.MOVE){
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
            this._down = !!(e.buttons & 0b001);

            if (this._curTool == MOUSE_TOOLS.MOVE) return;

            if (this._down){
                this._brushPoints.push(new Vector(e.offsetX, this._camera.getDimensions().y - e.offsetY));
            }
            else{
                this._clearGeo();
            }
        });
        canvas.addEventListener('mouseup', e => {
            this._down = !!(e.buttons & 0b001);

            if (this._down || this._brushPoints.length == 0) return;

            //submit points to new object
            if (this._createObjCallback){
                const xposeMat = this._camera.getInvMatrix().clone().transpose();
                for (let i = 0; i < this._splinePoints.length; i++){
                    this._splinePoints[i]
                        .divide(this._camera.getDimensions())
                        .scale(2)
                        .subtractScalar(1)
                        .multiplyMat3(xposeMat);
                }

                this.onCommit.emit(this._createObjCallback, this._splinePoints);
            }
            
            this._clearGeo();
        });
        canvas.addEventListener('wheel', e => {
            this._camera.zoom(-e.deltaY / 200);
        });

        onResize.addListener(this.resize.bind(this));
    }

    get tool(){return this._curTool}

    private _setupRenderPass(env: Environment): RenderPass {
        const gl = env.ctx;
        const vao = WGL.nullError(env.ctx.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = env.getProgram(RENDER_PROGRAM_ID, Mouse.precompileShader);

        if (!program) {
            throw new Error(`Could not find program with ID: ${String(RENDER_PROGRAM_ID)} `);
        }

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        return new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                matrixUniform: (()=>{
                    const uniform = new WGL.Uniform(gl, program, 'u_viewMatrix', WGL.Uniform_Types.MAT3);
                    uniform.set(false, new Mat3().data);
                    return uniform;
                })(),
            },
            attributes: {
                planeGeoAttrib: (()=>{
                    const planeGeo = WGL.createPlaneGeo().map(i => (i + 1) / 2);
                    const attrib = new WGL.Attribute(gl, program, 'a_planeGeo');
                    attrib.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attrib;
                })(),
                xfrmAttrib: (()=>{
                    const attrib = new WGL.Attribute(gl, program, 'a_xfrm');
                    attrib.setDivisor(1);
                    return attrib;
                })(),
                endPointAttrib: (()=>{
                    const attrib = new WGL.Attribute(gl, program, 'a_endPoints');
                    attrib.setDivisor(1);
                    return attrib;
                })(),
                controlPointAttrib: (()=>{
                    const attrib = new WGL.Attribute(gl, program, 'a_controlPoints');
                    attrib.setDivisor(1);
                    return attrib;
                })(),
            },
        });
    }

    private _recalcGeo(): void {
        const spline = Bezier.splineFromPoints(this._brushPoints);
        const bounds = new Array<ReturnType<typeof Bezier.boundsFromCurve>>(this._brushPoints.length - 1);
        const xywhList = new Array<number>(bounds.length * 4);
        const endPoints = new Array<number>(xywhList.length);
        const controlPoints = new Array<number>(xywhList.length);

        for (let i = 0; i < bounds.length; i++){
            const splineIdx = i * 3;
            const curve = [
                spline[splineIdx + 0],
                spline[splineIdx + 1],
                spline[splineIdx + 2],
                spline[splineIdx + 3]
            ];
            bounds[i] = Bezier.boundsFromCurve(curve, 10);
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

        //fill points list
        for (let i = 0; i < bounds.length; i++){
            const splineIdx = i * 3;
            const pointIdx = i * 4;
            endPoints[pointIdx + 0] = spline[splineIdx + 0].x;
            endPoints[pointIdx + 1] = spline[splineIdx + 0].y;
            endPoints[pointIdx + 2] = spline[splineIdx + 3].x;
            endPoints[pointIdx + 3] = spline[splineIdx + 3].y;
            controlPoints[pointIdx + 0] = spline[splineIdx + 1].x;
            controlPoints[pointIdx + 1] = spline[splineIdx + 1].y;
            controlPoints[pointIdx + 2] = spline[splineIdx + 2].x;
            controlPoints[pointIdx + 3] = spline[splineIdx + 2].y;
        }

        //Set output buffers
        this._renderPass.gl.bindVertexArray(this._renderPass.vao);
        this._renderPass.attributes!.xfrmAttrib.set(new Float32Array(xywhList), 4, this._renderPass.gl.FLOAT);
        this._renderPass.attributes!.endPointAttrib.set(new Float32Array(endPoints), 4, this._renderPass.gl.FLOAT);
        this._renderPass.attributes!.controlPointAttrib.set(new Float32Array(controlPoints), 4, this._renderPass.gl.FLOAT);
        this._splinePoints = spline;
        this._renderLength = bounds.length;
    }

    private _clearGeo(): void {
        this._brushPoints = [];
        this._splinePoints = [];
        this._renderLength = 0;
    }

    setTool(tool: {type: MOUSE_TOOLS, newObj?: NewObjectCallback}): void {
        this._curTool = tool.type;
        this._createObjCallback = tool.newObj ?? null;
    }

    resize(dimensions: ConstVector): void {
        const scaleMatrix = new Mat3([
            1 / dimensions.x, 0, 0,
            0, 1 / dimensions.y, 0,
            0, 0, 1
        ]);

        this._renderPass.gl.useProgram(this._renderPass.program);
        this._renderPass.uniforms!.matrixUniform.set(false, scaleMatrix.data);
    }

    render(): void {
        if (this._renderLength == 0) return;

        this._renderPass.enable();
        this._renderPass.renderInstanced(this._renderLength);
        this._renderPass.disable();
    }
}