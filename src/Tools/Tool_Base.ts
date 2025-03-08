import { TOOLS } from './Tools_Enum';
import { Mat3 } from "../lib/Mat3";
import { ConstVector } from '../lib/Vector';
import * as WGL from '../lib/wgl';
import Environment from "../Environment";

export default abstract class Tool_Base {
    static compileShader(gl: WebGL2RenderingContext, vertSource: string, fragSource: string): WebGLProgram {
        const vs = WGL.createShader(gl, gl.VERTEX_SHADER, vertSource);
        const fs = WGL.createShader(gl, gl.FRAGMENT_SHADER, fragSource);
        const program = WGL.createProgram(gl, vs, fs);

        return program;
    }

    protected _env: Environment;
    
    readonly id: number;
    readonly icon: string;

    constructor(id: TOOLS, icon: string, env: Environment){
        this._env = env;
        this.id = id;
        this.icon = icon;
    }

    mouseCommitHandler: (points: ConstVector[]) => void = ()=>{}
    mouseMoveHandler: (isDown: boolean, delta: ConstVector, middleMouse: boolean) => void = () => {}

    abstract update(delta: number): void;
    abstract render(viewMat: Mat3, invViewMat: Mat3): void;
}