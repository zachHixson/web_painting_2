import { Mat3 } from "../lib/Mat3";
import EventEmitter from "../lib/EventEmitter";
import Environment from "../Environment";
import { ConstVector } from "../lib/Vector";

export default abstract class Object_Base {
    protected _env: Environment;

    onExpire = new EventEmitter<(args: {obj: Object_Base})=>void>();

    constructor(_points: ConstVector[], env: Environment){
        this._env = env;
    }

    get ctx(){return this._env.ctx}

    abstract render(viewMat: Mat3): void;
}