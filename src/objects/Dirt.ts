import Object_Base from "./Object_Base";
import { Mat3 } from "../lib/Mat3";
import { ConstVector } from "../lib/Vector";
import Environment from "../Environment";
import { registerPrecompileCallback } from "../ShaderPrecompiler";
import * as WGL from '../lib/wgl';
import dirtVSource from '../shaders/dirtVertex.glsl?raw';
import dirtFSource from '../shaders/dirtFragment.glsl?raw';
import RenderPass from "../lib/RenderPass";
import * as Bezier from '../lib/Bezier';
import * as Util from '../lib/Util';

export default class Dirt extends Object_Base {
    private static _renderProgram: WebGLProgram;

    static _shaderInit = (()=>{
        registerPrecompileCallback(gl => {
            const vs = WGL.createShader(gl, gl.VERTEX_SHADER, dirtVSource);
            const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, dirtFSource);
            this._renderProgram = WGL.createProgram(gl, vs, fs);
            return true;
        });
    })();

    private _renderPass: RenderPass;
    private _renderCount: number = 0;
    private _backAnim: number = 0;

    readonly bounds: Util.Rect;

    constructor(points: ConstVector[], env: Environment){
        super(points, env);

        const interpPoints = Bezier.interpolateSpline(points, 0.1 * env.camera.getScale());
        const startingData = this._getPositionData(interpPoints);

        this._renderPass = this._setupRenderPasses(startingData, env);
        this._renderCount = interpPoints.length - 1;
        this.bounds = Dirt._calcBounds(interpPoints, 100);
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

    private _setupRenderPasses(startingData: Float32Array, env: Environment): RenderPass {
        const gl = env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Error creating vertex array object'));
        const planeGeo = WGL.createPlaneGeo();

        gl.bindVertexArray(vao);
        gl.useProgram(Dirt._renderProgram);

        const renderPass = new RenderPass({
            gl,
            vao,
            program: Dirt._renderProgram,
            uniforms: {
                backAnim: new WGL.Uniform(gl, Dirt._renderProgram, 'u_backAnim', WGL.Uniform_Types.FLOAT),
                viewMat: new WGL.Uniform(gl, Dirt._renderProgram, 'u_viewMat', WGL.Uniform_Types.MAT3),
                decay: new WGL.Uniform(gl, Dirt._renderProgram, 'u_decay', WGL.Uniform_Types.FLOAT),
            },
            attributes: {
                planeGeo: (()=>{
                    const attr = new WGL.Attribute(gl, Dirt._renderProgram, 'a_planeGeo');
                    attr.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attr;
                })(),
                instPos: (()=>{
                    const attr = new WGL.Attribute(gl, Dirt._renderProgram, 'a_pos');
                    attr.set(startingData, 2, gl.FLOAT);
                    attr.setDivisor(1);
                    return attr;
                })(),
            },
        });

        return renderPass;
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