import { ConstVector, Vector } from "./lib/Vector";
import { Mat3 } from "./lib/Mat3";
import * as WGL from './lib/wgl';
import vertSource from './shaders/mouseVertex.glsl?raw';
import fragSource from './shaders/mouseFragment.glsl?raw';
import * as Bezier from './lib/Bezier';
import EventEmitter from "./lib/EventEmitter";
import RenderPass from "./lib/RenderPass";
import Environment from "./Environment";

/**
 * A class which handles the mouse calculations and drawing
 */
export default class Mouse {
    static compileShader(gl: WebGL2RenderingContext): WebGLProgram {
        const vs = WGL.createShader(gl, gl.VERTEX_SHADER, vertSource);
        const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, fragSource);
        const program = WGL.createProgram(gl, vs, fs);

        return program;
    }

    private _lastPos: Vector = new Vector();
    private _pos: Vector = new Vector();
    private _down: boolean = false;
    private _brushPoints: Vector[] = [];
    private _splinePoints: Vector[] = [];
    private _renderLength: number = 0;
    private _renderPass: RenderPass;

    readonly onCommit = new EventEmitter<(points: Vector[])=>void>();
    readonly onMouseMove = new EventEmitter<(isDown: boolean, delta: ConstVector, middleMouse: boolean)=>void>();
    readonly onMouseWheel = new EventEmitter<(deltaY: number)=>void>();

    enableDrawing: boolean = true;

    constructor(env: Environment, onResize: EventEmitter<(dimensions: ConstVector)=>void>){
        const canvas = env.ctx.canvas as HTMLCanvasElement;
        this._renderPass = this._setupRenderPass(env);

        canvas.addEventListener('mousemove', e => {
            this._lastPos.copy(this._pos);
            this._pos.set(e.offsetX, e.offsetY);

            const delta = this._pos.clone().subtract(this._lastPos).scale(2 / env.camera.getScale());
            delta.x *= -1;

            this.onMouseMove.emit(this._down, delta, !!(e.buttons & 0b100));

            if (this._down && this.enableDrawing){
                const curScreenPos = new Vector(e.offsetX, env.camera.getDimensions().y - e.offsetY);
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

            if (!this.enableDrawing) return;

            if (this._down){
                this._brushPoints.push(new Vector(e.offsetX, env.camera.getDimensions().y - e.offsetY));
            }
            else{
                this._clearGeo();
            }
        });
        canvas.addEventListener('mouseup', e => {
            this._down = !!(e.buttons & 0b001);

            if (this._down || this._brushPoints.length == 0) return;

            const xposeMat = env.camera.getInvMatrix().clone().transpose();

            for (let i = 0; i < this._splinePoints.length; i++){
                this._splinePoints[i]
                    .divide(env.camera.getDimensions())
                    .scale(2)
                    .subtractScalar(1)
                    .multiplyMat3(xposeMat);
            }

            this.onCommit.emit(this._splinePoints);
            
            this._clearGeo();
        });
        canvas.addEventListener('wheel', e => {
            this.onMouseWheel.emit(e.deltaY);
        });

        onResize.addListener(this.resize.bind(this));
    }

    private _setupRenderPass(env: Environment): RenderPass {
        const gl = env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Mouse.compileShader(gl);

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

    /**
     * Resizes the Mouse's rendering context to provided dimensions
     */
    resize(dimensions: ConstVector): void {
        const scaleMatrix = new Mat3([
            1 / dimensions.x, 0, 0,
            0, 1 / dimensions.y, 0,
            0, 0, 1
        ]);

        this._renderPass.gl.useProgram(this._renderPass.program);
        this._renderPass.uniforms!.matrixUniform.set(false, scaleMatrix.data);
    }

    /**
     * Renders the Mouse's preview path to the screen
     */
    render(): void {
        if (this._renderLength == 0) return;

        this._renderPass.enable();
        this._renderPass.renderInstanced(this._renderLength);
        this._renderPass.disable();
    }
}