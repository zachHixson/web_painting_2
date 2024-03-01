import { Mat3 } from "../lib/Mat3";
import EventEmitter from "../lib/EventEmitter";
import Environment from "../Environment";
import { ConstVector } from "../lib/Vector";
import * as WGL from '../lib/wgl';

export default abstract class Object_Base {
    protected _env: Environment;

    protected static _getDataTexture(gl: WebGL2RenderingContext, dimensions: number, inData?: Float32Array): WebGLTexture {
        const tex = WGL.nullError(gl.createTexture(), new Error('Error creating texture'));
        const emptyData = new Float32Array(dimensions * dimensions * 4);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, dimensions, dimensions, 0, gl.RGBA, gl.FLOAT, inData ?? emptyData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return tex;
    }

    onExpire = new EventEmitter<(args: {obj: Object_Base})=>void>();

    constructor(_points: ConstVector[], env: Environment){
        this._env = env;
    }

    get ctx(){return this._env.ctx}

    abstract update(delta: number): void;
    abstract render(viewMat: Mat3, invViewMat: Mat3): void;
}