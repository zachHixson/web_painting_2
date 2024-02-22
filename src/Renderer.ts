import { Mat3 } from './lib/Mat3';
import * as WGL from './lib/wgl';
import Renderable from './objects/Renderable';
import worldVSource from './shaders/worldVertex.glsl?raw';
import worldFSource from './shaders/worldFragment.glsl?raw';

export default class Renderer {
    private _ctx: WebGL2RenderingContext;
    private _worldProgram: WebGLProgram;
    private _positionAttr: WGL.Attribute;
    private _viewMat: WGL.Uniform;
    private _vao: WebGLVertexArrayObject;
    private _shaderCache = new Map<string, WebGLShader>();
    private _shaderCacheCallback: (shaderKey: string) => WebGLShader | null;

    constructor(canvas: HTMLCanvasElement){
        this._ctx = canvas.getContext('webgl2')!;

        const gl = this._ctx;
        const worldVS = WGL.createShader(gl, gl.VERTEX_SHADER, worldVSource)!;
        const worldFS = WGL.createShader(gl, gl.FRAGMENT_SHADER, worldFSource)!;

        this._worldProgram = WGL.createProgram(gl, worldVS, worldFS)!;
        this._positionAttr = new WGL.Attribute(gl, this._worldProgram, 'a_position');
        this._viewMat = new WGL.Uniform(gl, this._worldProgram, 'u_viewMat', WGL.Uniform_Types.MAT3);
        this._vao = gl.createVertexArray()!;

        gl.bindVertexArray(this._vao);

        this._positionAttr.set(new Float32Array(WGL.createPlaneGeo()), 2, gl.FLOAT);

        this._shaderCacheCallback = (shaderKey: string) => {
            return this._shaderCache.get(shaderKey) ?? null;
        }
    }

    get canvas(){return this._ctx.canvas}
    get checkShaderCache(){return this._shaderCacheCallback}

    resize(): void {
        const canvas = this._ctx.canvas as HTMLCanvasElement;
        const parentBounds = canvas.parentElement!.getBoundingClientRect();
        const width = parentBounds.width;
        const height = parentBounds.height;

        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }

    render(objects: Renderable[], viewMat: Mat3): void {
        const gl = this._ctx;

        //render world background
        gl.bindVertexArray(this._vao);
        gl.useProgram(this._worldProgram);
        this._viewMat.set(false, viewMat.data);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this._positionAttr.enable();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this._positionAttr.disable();

        //draw all objects
        for (let i = 0; i < objects.length; i++){
            objects[i].render(gl, viewMat);
        }
    }
}