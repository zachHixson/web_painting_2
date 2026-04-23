import type Environment from "../Environment";
import { TOOLS } from "./Tools_Enum";
import Tool_Base from "./Tool_Base";
import { Vector, ConstVector } from "../lib/Vector";
import { Compute_Texture_Swap } from "../lib/ComputeTexture";
import RenderPass from "../lib/RenderPass";
import * as WGL from '../lib/wgl';
import { Mat3 } from "../lib/Mat3";
import * as Bezier from '../lib/Bezier';
import windVSource from '../shaders/windVertex.glsl?raw';
import windFSource from '../shaders/windFragment.glsl?raw';
import windUSource from '../shaders/windUpdate.glsl?raw';
import computeVSource from '../shaders/computeVertex.glsl?raw';

const MAX_32I = Math.pow(2, 24) / 2;

/*
    Overall idea:
        - Wind strokes generate little wisps
        - Wisps consist of 8 verticies in a line, animated by GPU compute
        - Wisps are rendered using instanced rendering, 1 wisp = 1 instance
        - DataTex vec4 for wisps holds [x, y, normal.x, normal.y]
        - Front vec4 representing front of wisp holds [x, y, rotation, remainingLife]
*/

class Stroke {
    private _pts: Array<ConstVector>;

    constructor(pts: Array<ConstVector>) {
        this._pts = pts;
    }

    get length() {
        return this._pts.length;
    }

    getPt(idx: number) {
        return this._pts[idx];
    }
}

export default class Wind extends Tool_Base {
    static readonly WISP_LENGTH = 8;
    static readonly TEX_SIZE = 1024;
    static readonly TEX_SIZE_SQR = Wind.TEX_SIZE * Wind.TEX_SIZE;

    private _strokes = new Array<Stroke>();
    private _wispIdx = 0;
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
            },
            textures: {
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._windData.read.texture),
            },
        });

        renderPass.uniforms!.dataTexWidth.set(this._windData.read.width);

        return renderPass;
    }

    private _getWindUpdatePass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, computeVSource, windUSource);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const updatePass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                dataTexWidth: new WGL.Uniform(gl, program, 'u_dataTexWidth', WGL.Uniform_Types.INT),
                delta: new WGL.Uniform(gl, program, 'u_delta', WGL.Uniform_Types.FLOAT),
            },
            textures: {
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._windData.read.texture),
            },
            attributes: {
                planeGeo: (()=>{
                    const planeGeo = WGL.createPlaneGeo();
                    const attr = new WGL.Attribute(gl, program, 'a_planeGeo');
                    attr.set(new Float32Array(planeGeo), 2, gl.FLOAT);
                    return attr;
                })(),
            },
        });

        updatePass.uniforms!.dataTexWidth.set(this._windData.read.width);

        return updatePass;
    }

    private _spawnWisp(pos: ConstVector, normal: ConstVector) {
        const tex = this._windData.read;
        const gl = this._env.ctx;
        const ptData = new Int32Array(4 * 8);
        const xIdx = this._wispIdx % Wind.TEX_SIZE;
        const yIdx = Math.floor(this._wispIdx / Wind.TEX_SIZE);

        for (let i = 0; i < 8; i++) {
            const idxOffset = i * 4;
            const posOffset = i * 50;

            ptData[0 + idxOffset] = pos.x + normal.x * posOffset;
            ptData[1 + idxOffset] = pos.y + normal.y * posOffset;
            ptData[2 + idxOffset] = normal.x * MAX_32I;
            ptData[3 + idxOffset] = normal.y * MAX_32I;
        }

        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            xIdx, yIdx,
            8, 1,
            gl.RGBA_INTEGER,
            gl.INT,
            ptData
        );

        this._wispIdx = (this._wispIdx + 8) % Wind.TEX_SIZE_SQR;
    }

    private _spawnNewWisps() {
        const SPAWN_CHANCE = 0.008;

        for (let i = 0; i < this._strokes.length; i++) {
            const stroke = this._strokes[i];

            for (let j = 0; j < stroke.length - 1; j++) {
                const p1 = stroke.getPt(j);
                const p2 = stroke.getPt(j + 1);
                const norm = p2.clone().subtract(p1).normalize();

                if (Math.random() < SPAWN_CHANCE) {
                    this._spawnWisp(p1, norm);
                }
            }
        }
    }

    private _runUpdatePass(delta: number) {
        const gl = this._env.ctx;
        const fb = this._windData.write.framebuffer;

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this._windData.write.texture,
            0
        );

        gl.viewport(0, 0, Wind.TEX_SIZE, Wind.TEX_SIZE);

        this._windUpdatePass.textures!.dataTex.texture = this._windData.read.texture;

        this._windUpdatePass.enable();
        this._windUpdatePass.uniforms!.delta.set(delta);
        this._windUpdatePass.renderInstanced(1);
        this._windUpdatePass.disable();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        this._windData.swap();
        this._time += delta;
    }

    mouseCommitHandler = (points: ConstVector[]) => {
        const positions = Bezier.interpolateSpline(points, 0.5 * this._env.camera.getScale());

        this._strokes.push(new Stroke(positions));
    }

    update(delta: number): void {
        this._spawnNewWisps();
        this._runUpdatePass(delta);
    }

    render(viewMat: Mat3): void {
        this._windRenderPass.enable();
        this._windRenderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._windRenderPass.renderInstanced(Wind.TEX_SIZE_SQR / Wind.WISP_LENGTH, 36); //uncomment
        this._windRenderPass.disable();
    }
}
