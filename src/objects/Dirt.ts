import Object_Base from "./Object_Base";
import { Mat3 } from "../lib/Mat3";
import { ConstVector } from "../lib/Vector";
import Environment from "../Environment";
import { registerPrecompileCallback } from "../ShaderPrecompiler";

export default class Dirt extends Object_Base {
    static _shaderInit = (()=>{
        registerPrecompileCallback(gl => {
            console.log("Dirt Precompiled")
            return true;
        });
    })();

    constructor(points: ConstVector[], env: Environment){
        super(points, env);
        console.log("Dirt Created");
    }

    render(viewMat: Mat3): void {
        //
    }
}