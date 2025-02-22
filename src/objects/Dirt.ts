import Object_Base from "./Object_Base";
import { Mat3 } from "../lib/Mat3";
import { ConstVector } from "../lib/Vector";
import Environment from "../Environment";
import * as WGL from '../lib/wgl';
import dirtVSource from '../shaders/dirtVertex.glsl?raw';
import dirtFSource from '../shaders/dirtFragment.glsl?raw';
import dirtCVSource from '../shaders/dirtCVertex.glsl?raw';
import dirtCFSource from '../shaders/dirtCFragment.glsl?raw';
import RenderPass from "../lib/RenderPass";
import * as Bezier from '../lib/Bezier';
import * as Util from '../lib/Util';

const RENDER_PROGRAM_ID = Symbol('DIRT_RENDER');
const COMPUTE_PROGRAM_ID = Symbol('DIRT_COMPUTE');

/**
 * A class for creating dirt strokes
 */
export default class Dirt extends Object_Base {
    static precompRenderShader(gl: WebGL2RenderingContext) {
        const vs = WGL.createShader(gl, gl.VERTEX_SHADER, dirtVSource);
        const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, dirtFSource);
        const program = WGL.createProgram(gl, vs, fs);
        return {id: RENDER_PROGRAM_ID, program};
    }

    static precompComputeShader(gl: WebGL2RenderingContext) {
        const vs = WGL.createShader(gl, gl.VERTEX_SHADER, dirtCVSource);
        const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, dirtCFSource);
        const program = WGL.createProgram(gl, vs, fs);
        return {id: COMPUTE_PROGRAM_ID, program};
    }

    private _renderPass: RenderPass;
    private _computePass: RenderPass;
    private _renderCount: number = 0;
    private _backAnim: number = 0;

    readonly bounds: Util.Rect;

    constructor(points: ConstVector[], env: Environment){
        super(points, env);

        const interpPoints = Bezier.interpolateSpline(points, 0.1 * env.camera.getScale());
        const startingData = this._getPositionData(interpPoints);
        const vao = WGL.nullError(this._env.ctx.createVertexArray(), new Error('Error creating vertex array object'));

        this._renderPass = this._setupRenderPass(startingData, vao);
        this._computePass = this._setupComputePass(startingData, vao);
        this._renderCount = interpPoints.length - 1;
        this.bounds = Dirt._calcBounds(interpPoints, 100);

        this._renderComputePass();
    }

    private _getPositionData(points: ConstVector[]): Float32Array {
        const expanded = new Float32Array(points.length * 2);

        for (let i = 0; i < points.length; i++){
            const idx = i * 2;
            expanded[idx + 0] = points[i].x;
            expanded[idx + 1] = points[i].y;
        }

        return expanded;
    }

    private _setupRenderPass(startingData: Float32Array, vao: WebGLVertexArrayObject): RenderPass {
        const gl = this._env.ctx;
        const program = this._env.getProgram(RENDER_PROGRAM_ID, Dirt.precompRenderShader);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                backAnim: new WGL.Uniform(gl, program, 'u_backAnim', WGL.Uniform_Types.FLOAT),
                viewMat: new WGL.Uniform(gl, program, 'u_viewMat', WGL.Uniform_Types.MAT3),
                decay: new WGL.Uniform(gl, program, 'u_decay', WGL.Uniform_Types.FLOAT),
            },
            attributes: {
                planeGeo: (()=>{
                    const planeGeo = WGL.createPlaneGeo();
                    const attr = new WGL.Attribute(gl, program, 'a_planeGeo');
                    attr.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attr;
                })(),
                instPos: (()=>{
                    const attr = new WGL.Attribute(gl, program, 'a_pos');
                    attr.set(startingData, 2, gl.FLOAT);
                    attr.setDivisor(1);
                    return attr;
                })(),
            },
        });

        return renderPass;
    }

    private _setupComputePass(startingData: Float32Array, vao: WebGLVertexArrayObject): RenderPass {
        const gl = this._env.ctx;
        const program = this._env.getProgram(COMPUTE_PROGRAM_ID, Dirt.precompComputeShader);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                viewMat: new WGL.Uniform(gl, program, 'u_viewMat', WGL.Uniform_Types.MAT3),
                erase: new WGL.Uniform(gl, program, 'u_erase', WGL.Uniform_Types.BOOL),
            },
            attributes: {
                planeGeo: (()=>{
                    const planeGeo = WGL.createPlaneGeo().map(i => i * 50.0);
                    const attr = new WGL.Attribute(gl, program, 'a_planeGeo');
                    attr.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attr;
                })(),
                instPos: (()=>{
                    const attr = new WGL.Attribute(gl, program, 'a_pos');
                    attr.set(startingData, 2, gl.FLOAT);
                    attr.setDivisor(1);
                    return attr;
                })(),
            },
        });

        return renderPass;
    }

    private _renderComputePass(): void {
        this._env.dirtBuffer.setAsRenderTarget();
        this._env.ctx.viewport(0, 0, this._env.dirtBuffer.width, this._env.dirtBuffer.width);
        this._computePass.enable();
        this._computePass.uniforms!.viewMat.set(false, [Environment.SIZE_INV, 0, 0, 0, Environment.SIZE_INV, 0, 0, 0, 1]);
        this._computePass.renderInstanced(this._renderCount);
        this._computePass.disable();
        this._env.dirtBuffer.unsetRenderTarget();
        this._env.ctx.viewport(0, 0, this._env.ctx.canvas.width, this._env.ctx.canvas.height);
    }

    update(delta: number){
        this._backAnim = Math.min(this._backAnim + (delta * 10), 1);
    }

    render(viewMat: Mat3): void {
        if (!Util.rectIntersect(this.bounds, this._env.camera.getScreenBounds())) return;

        this._renderPass.enable();
        this._renderPass.uniforms!.backAnim.set(Dirt._interpBack(this._backAnim));
        this._renderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._renderPass.renderInstanced(this._renderCount);
        this._renderPass.disable();
    }
}