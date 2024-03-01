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

    constructor(points: ConstVector[], env: Environment){
        super(points, env);

        const interpPoints = Bezier.interpolateSpline(points, 0.2);
        const startingData = this._getXfrmData(interpPoints);

        this._renderPass = this._setupRenderPasses(startingData, env);
        this._renderCount = interpPoints.length - 1;
    }

    private _getXfrmData(points: ConstVector[]): Float32Array {
        const startingData = new Float32Array(32 * 32 * 4);

        for (let i = 0; i < points.length; i++){
            const idx = i * 4;
            startingData[idx + 0] = points[i].x;
            startingData[idx + 1] = points[i].y;
        }

        return startingData;
    }

    private _setupRenderPasses(startingData: Float32Array, env: Environment): RenderPass {
        const gl = env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Error creating vertex array object'));
        const xfrmTex = Dirt._getDataTexture(gl, 32, startingData);
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
            },
            attributes: {
                planeGeo: (()=>{
                    const attr = new WGL.Attribute(gl, Dirt._renderProgram, 'a_planeGeo');
                    attr.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attr;
                })(),
            },
            textures: {
                xfrmTex: new WGL.Texture_Uniform(gl, Dirt._renderProgram, 'u_xfrm', xfrmTex),
            }
        });

        return renderPass;
    }

    update(){}

    render(viewMat: Mat3): void {
        this._renderPass.enable();
        this._renderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._renderPass.renderInstanced(this._renderCount);
        this._renderPass.disable();
    }
}