import { Mat3 } from "../lib/Mat3";
import EventEmitter from "../lib/EventEmitter";
import Environment from "../Environment";
import { ConstVector } from "../lib/Vector";
import * as WGL from '../lib/wgl';
import * as Util from '../lib/Util';

/**
 * A base class for all child objects of the Environment class
 */
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

    /**
     * Calculates the world space bounds of the object
     */
    protected static _calcBounds(points: ConstVector[], padding: number = 0): Util.Rect {
        const firstPoint = points[0];
        const min = firstPoint.clone();
        const max = min.clone();

        points.forEach(p => {
            min.x = Math.min(min.x, p.x);
            min.y = Math.min(min.y, p.y);
            max.x = Math.max(max.x, p.x);
            max.y = Math.max(max.y, p.y);
        });

        min.subtractScalar(padding);
        max.addScalar(padding);

        return {min, max};
    }

    /**
     * Interpolate back animation
     */
    protected static _interpBack(val: number): number {
        const c1 = 3;
        const c3 = c1 + 1;
        const vm1 = val - 1;

        return 1 + c3 * Math.pow(vm1, 3) + c1 * Math.pow(vm1, 2);
    }

    /**
     * Emits when it's time for the object to be removed
     */
    onExpire = new EventEmitter<(args: {obj: Object_Base})=>void>();

    constructor(_points: ConstVector[], env: Environment){
        this._env = env;
    }

    get ctx(){return this._env.ctx}

    abstract update(delta: number): void;
    abstract render(viewMat: Mat3, invViewMat: Mat3): void;
}