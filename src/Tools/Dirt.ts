import type Environment from '../Environment';
import { TOOLS } from './Tools_Enum';
import Tool_Base from './Tool_Base';
import { ConstVector } from '../lib/Vector';
import { Compute_Texture_Swap } from '../lib/ComputeTexture';
import RenderPass from '../lib/RenderPass';
import * as WGL from '../lib/wgl';
import dirtVSource from '../shaders/dirtVertex.glsl?raw';
import dirtFSource from '../shaders/dirtFragment.glsl?raw';
import computeVertex from '../shaders/computeVertex.glsl?raw';
import dirtUSource from '../shaders/dirtUpdate.glsl?raw';
import grassVSource from '../shaders/grassVertex.glsl?raw';
import grassFSource from '../shaders/grassFragment.glsl?raw';
import { Mat3 } from '../lib/Mat3';
import * as Bezier from '../lib/Bezier';

export default class Dirt extends Tool_Base {
    static readonly TEX_SIZE = 1024;
    static readonly TEX_SIZE_SQR = Dirt.TEX_SIZE * Dirt.TEX_SIZE;

    private _dirtData: Compute_Texture_Swap;
    private _destBuffer: Int32Array;
    private _dirtRenderPass: RenderPass;
    private _dirtUpdatePass: RenderPass;
    private _grassRenderPass: RenderPass;
    private _grassUpdatePass: RenderPass;
    private _time: number = 0;

    constructor(id: TOOLS, icon: string, env: Environment) {
        const emptyTex = new Int32Array(Dirt.TEX_SIZE * Dirt.TEX_SIZE * 4);

        super(id, icon, env);

        this._dirtData = new Compute_Texture_Swap(env.ctx, Dirt.TEX_SIZE, env.ctx.RGBA32I, env.ctx.RGBA_INTEGER, env.ctx.INT, emptyTex);
        this._destBuffer = new Int32Array(Dirt.TEX_SIZE * Dirt.TEX_SIZE * 4);
        this._dirtRenderPass = this._getDirtRenderPass();
        this._dirtUpdatePass = this._getDirtUpdatePass();
        this._grassRenderPass = this._getGrassRenderPass();
        this._grassUpdatePass = this._getGrassUpdatePass();
    }

    private _getDirtRenderPass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, dirtVSource, dirtFSource);

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
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._dirtData.read.texture),
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

        renderPass.uniforms!.dataTexWidth.set(this._dirtData.read.width);

        return renderPass;
    }

    private _getDirtUpdatePass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, computeVertex, dirtUSource);

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
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._dirtData.read.texture),
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

        updatePass.uniforms!.dataTexWidth.set(this._dirtData.read.width);

        return updatePass;
    }

    private _getGrassRenderPass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, grassVSource, grassFSource);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                viewMat: new WGL.Uniform(gl, program, 'u_viewMat', WGL.Uniform_Types.MAT3),
                dataTexWidth: new WGL.Uniform(gl, program, 'u_dataTexWidth', WGL.Uniform_Types.INT),
                time: new WGL.Uniform(gl, program, 'u_time', WGL.Uniform_Types.FLOAT),
            },
            textures: {
                dataTex: new WGL.Texture_Uniform(gl, program, 'u_dataTex', this._dirtData.read.texture),
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

        renderPass.uniforms!.dataTexWidth.set(this._dirtData.read.width);

        return renderPass;
    }

    private _getGrassUpdatePass(): RenderPass {
        const gl = this._env.ctx;
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Could not create vertex array object.'));
        const program = Tool_Base.compileShader(gl, grassVSource, grassFSource);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
        });

        return renderPass;
    }

    mouseCommitHandler = (points: ConstVector[]) => {
        const positions = Bezier.interpolateSpline(points, 0.1 * this._env.camera.getScale());
        const tex = this._dirtData.read;
        const fb = tex.framebuffer;
        const gl = this._env.ctx;
        let pIdx = 0;

        //read existing particle data into buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.texture, 0);
        gl.readPixels(0, 0, tex.width, tex.width, gl.RGBA_INTEGER, gl.INT, this._destBuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //insert new particle data into buffer
        for (let i = 0; i < this._destBuffer.length && pIdx < positions.length; i += 4) {
            if (this._destBuffer[i] != 0) continue;

            this._destBuffer[i + 0] = positions[pIdx].x;
            this._destBuffer[i + 1] = positions[pIdx].y;
            this._destBuffer[i + 2] = 0;
            this._destBuffer[i + 3] = 0;

            pIdx++;
        }

        //upload buffer back into GPU texture
        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32I,
            tex.width,
            tex.width,
            0,
            gl.RGBA_INTEGER,
            gl.INT,
            this._destBuffer
        );
    }

    update(delta: number): void {
        const gl = this._env.ctx;
        const fb = this._dirtData.write.framebuffer;

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this._dirtData.write.texture,
            0
        );

        gl.viewport(0, 0, Dirt.TEX_SIZE, Dirt.TEX_SIZE);

        this._dirtUpdatePass.textures!.dataTex.texture = this._dirtData.read.texture;

        this._dirtUpdatePass.enable();
        this._dirtUpdatePass.uniforms!.delta.set(delta);
        this._dirtUpdatePass.renderInstanced(1);
        this._dirtUpdatePass.disable();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        this._dirtData.swap();
        this._time += delta;
    }

    render(viewMat: Mat3): void {
        //render dirt
        this._dirtRenderPass.enable();
        this._dirtRenderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._dirtRenderPass.renderInstanced(Dirt.TEX_SIZE_SQR);
        this._dirtRenderPass.disable();

        //rendgrassRe_grassRenderPass
        this._grassRenderPass.enable();
        this._grassRenderPass.uniforms!.viewMat.set(false, viewMat.data);
        this._grassRenderPass.uniforms!.time.set(this._time);
        this._grassRenderPass.renderInstanced(Dirt.TEX_SIZE_SQR * 10);
        this._grassRenderPass.disable();
    }
}