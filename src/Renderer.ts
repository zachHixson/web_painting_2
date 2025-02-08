import { Mat3 } from './lib/Mat3';
import Environment from './Environment';
import Object_Base from './objects/Object_Base';

export type PrecompileCallback = (gl: WebGL2RenderingContext)=>{id: symbol, program: WebGLProgram};

/**
 * A renderer for managing rendering context and rendering objects
 */
export default class Renderer {
    private _precompiledPrograms: {[id: symbol]: WebGLProgram | null} = {};

    private _ctx: WebGL2RenderingContext;

    constructor(ctx: WebGL2RenderingContext, onResize: InstanceType<typeof Environment>['onResize']){
        this._ctx = ctx;

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
        //draw all objects
        for (let i = 0; i < objects.length; i++){
            objects[i].render(viewMat, invViewMat);
        }
    }
}