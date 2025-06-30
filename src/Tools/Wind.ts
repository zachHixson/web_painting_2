import type Environment from "../Environment";
import { TOOLS } from "./Tools_Enum";
import Tool_Base from "./Tool_Base";
import { ConstVector } from "../lib/Vector";
import { Compute_Texture_Swap } from "../lib/ComputeTexture";
import RenderPass from "../lib/RenderPass";
import * as WGL from '../lib/wgl';
import { Mat3 } from "../lib/Mat3";
import * as Bezier from '../lib/Bezier';
import windVSource from '../shaders/windVertex.glsl?raw';
import windFSource from '../shaders/windFragment.glsl?raw';
import windUSource from '../shaders/windUpdate.glsl?raw';
import computeVSource from '../shaders/computeVertex.glsl?raw';

enum WISP_POS {
    TOP = 0,
    CENTER,
    BOTTOM,
};

const WISP_LENGTH = 8;
const WISP_GEO = (()=>{
    /*
        buffer contains list of pathOffset and trianglePosition pairs
    */
    const segments = WISP_LENGTH - 3;
    const buffLength = segments * 6 + 6;
    const buff = new Array<number>(buffLength * 2).fill(0);

    buff[0] = 0;
    buff[1] = WISP_POS.CENTER;
    buff[2] = 1;
    buff[3] = WISP_POS.TOP;
    buff[4] = 1;
    buff[5] = WISP_POS.BOTTOM;

    for (let i = 0; i < segments; i++) {
        let idx = i * 12 + 6;

        buff[idx++] = i + 1;
        buff[idx++] = WISP_POS.BOTTOM;
        buff[idx++] = i + 1;
        buff[idx++] = WISP_POS.TOP;
        buff[idx++] = i + 2;
        buff[idx++] = WISP_POS.TOP;

        buff[idx++] = i + 2;
        buff[idx++] = WISP_POS.TOP;
        buff[idx++] = i + 2;
        buff[idx++] = WISP_POS.BOTTOM;
        buff[idx++] = i + 1;
        buff[idx++] = WISP_POS.BOTTOM;
    }

    buff[buff.length - 6] = WISP_LENGTH - 1;
    buff[buff.length - 5] = WISP_POS.CENTER;
    buff[buff.length - 4] = WISP_LENGTH - 2;
    buff[buff.length - 3] = WISP_POS.BOTTOM;
    buff[buff.length - 2] = WISP_LENGTH - 2;
    buff[buff.length - 1] = WISP_POS.TOP;

    return buff;
})();

export default class Wind extends Tool_Base {
    static readonly TEX_SIZE = 1024;
    static readonly TEX_SIZE_SQR = Wind.TEX_SIZE * Wind.TEX_SIZE;

    private _windData: Compute_Texture_Swap;
    private _destBuffer: Int32Array;
    private _windRenderPass: RenderPass;
    private _windUpdatePass: RenderPass;
    private _time: number = 0;

    constructor(id: TOOLS, icon: string, env: Environment) {
        const emptyTex = new Int32Array(Wind.TEX_SIZE_SQR * 4);

        super(id, icon, env);

        this._windData = new Compute_Texture_Swap(env.ctx, Wind.TEX_SIZE, env.ctx.RGBA32I, env.ctx.RGBA_INTEGER, env.ctx.INT, emptyTex);
        this._destBuffer = new Int32Array(Wind.TEX_SIZE * Wind.TEX_SIZE * 4);
        this._windRenderPass = this._getWindRenderPass();
        this._windUpdatePass = this._getWindUpdatePass();
    }

    private _getWindRenderPass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, windVSource, windFSource);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                viewMat: new WGL.Uniform(gl, program, 'u_viewMat', WGL.Uniform_Types.MAT3),
                dataTexWidth: new WGL.Uniform(gl, program, 'u_dataTexWidth', WGL.Uniform_Types.INT),
                wispGeo: new WGL.Uniform(gl, program, 'u_wispGeo', WGL.Uniform_Types.SIV),
            },
            textures: {
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._windData.read.texture),
            },
        });

        renderPass.uniforms!.wispGeo.set(WISP_GEO);

        return renderPass;
    }

    private _getWindUpdatePass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, computeVSource, windUSource);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
        });

        return renderPass;
    }

    mouseCommitHandler = (points: ConstVector[]) => {
        const positions = Bezier.interpolateSpline(points, 0.5 * this._env.camera.getScale());
        const dirs = new Array<ConstVector>(positions.length);

        for (let i = 0; i < dirs.length - 1; i++) {
            dirs[i] = positions[i + 1].clone().subtract(positions[i]).normalize();
        }

        dirs[dirs.length - 1] = dirs[dirs.length - 2];

        this._env.addWindGust(positions, dirs);

        /*
            - Use positions to draw wind velocities to world-space wind velocity buffer
            - GPU compute is run using secondary particle position buffer
                - Buffer uses multiple pixels for each particle
                - If the current "slot" is empty, then the compute shader checks a random position on the wind velocity buffer
                    - If the wind velocity at that location is greater than 0, create a wind particle
                - If the slot is not empty, update the particle using a set of rules in order to create a "wisp" style effect
                    - Each particle has a limited lifetime, when that lifetime is reached, all pixels related to that slot are reset to 0
        */
    }

    update(delta: number): void {
        //
    }

    render(viewMat: Mat3): void {
        this._windRenderPass.enable();
        this._windRenderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._windRenderPass.renderInstanced(Wind.TEX_SIZE_SQR);
        this._windRenderPass.disable();
    }
}