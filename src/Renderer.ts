import { Mat3 } from './lib/Mat3';
import * as WGL from './lib/wgl';
import worldVSource from './shaders/worldVertex.glsl?raw';
import worldFSource from './shaders/worldFragment.glsl?raw';
import Environment from './Environment';
import Object_Base from './objects/Object_Base';

export type PrecompileCallback = (gl: WebGL2RenderingContext)=>{id: symbol, program: WebGLProgram};

/**
 * A renderer for managing rendering context and rendering objects
 */
export default class Renderer {
    private _vao: WebGLVertexArrayObject;
    private _precompiledPrograms: {[id: symbol]: WebGLProgram | null} = {};

    private _ctx: WebGL2RenderingContext;
    private _worldProgram: WebGLProgram;
    private _positionAttr: WGL.Attribute;
    private _viewMat: WGL.Uniform;

    constructor(ctx: WebGL2RenderingContext, onResize: InstanceType<typeof Environment>['onResize']){
        const gl = ctx;
        const modifiedFSrc = worldFSource.replace('${WORLD_SIZE}', Environment.SIZE.toString());
        const worldVS = WGL.createShader(gl, gl.VERTEX_SHADER, worldVSource);
        const worldFS = WGL.createShader(gl, gl.FRAGMENT_SHADER, modifiedFSrc);
        this._ctx = gl;
        this._vao = WGL.nullError(gl.createVertexArray(), new Error('Error creating vertex array object'));
        this._worldProgram = WGL.createProgram(gl, worldVS, worldFS);
        this._positionAttr = new WGL.Attribute(gl, this._worldProgram, 'a_position');
        this._viewMat = new WGL.Uniform(gl, this._worldProgram, 'u_viewMat', WGL.Uniform_Types.MAT3);

        gl.bindVertexArray(this._vao);
        this._positionAttr.set(new Float32Array(WGL.createPlaneGeo()), 2, gl.FLOAT);

        onResize.addListener(this.resize.bind(this));
    }

    get canvas(){return this._ctx.canvas}

    /**
     * Compiles a WebGL shader program and stores it for later reuse
     */
    compileProgram(callback: PrecompileCallback): ReturnType<PrecompileCallback> {
        const { id, program } = callback(this._ctx);
        this._precompiledPrograms[id] = program;
        return callback(this._ctx);
    }

    /**
     * Precompiles a list of WebGL shader programs and stores them for later reuse
     */
    precompilePrograms(callbacks: PrecompileCallback[]): void {
        callbacks.forEach(callback => {
            this.compileProgram(callback);
        });
    }

    /**
     * Returns an already compiled WebGL shader program
     */
    getProgram(id: symbol): WebGLProgram | null {
        return this._precompiledPrograms[id] || null;
    }

    /**
     * Resizes the main drawing context to the current size of it's canvas
     */
    resize(): void {
        const gl = this._ctx;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    /**
     * Renders a list of objects
     */
    render(objects: Object_Base[], viewMat: Mat3, invViewMat: Mat3): void {
        const gl = this._ctx;

        //----------------------------- This should be moved to a "Pass" in Environment class -------------------------------
        //render world background
        gl.bindVertexArray(this._vao);
        gl.useProgram(this._worldProgram);
        this._viewMat.set(false, invViewMat.data);
        this._positionAttr.enable();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this._positionAttr.disable();

        //draw all objects
        for (let i = 0; i < objects.length; i++){
            objects[i].render(viewMat, invViewMat);
        }
    }
}