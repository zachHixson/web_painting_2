import { Mat3 } from './lib/Mat3';
import * as WGL from './lib/wgl';
import worldVSource from './shaders/worldVertex.glsl?raw';
import worldFSource from './shaders/worldFragment.glsl?raw';
import { registerPrecompileCallback } from './ShaderPrecompiler';
import Environment from './Environment';
import Object_Base from './objects/Object_Base';

export default class Renderer {
    private static _ctx: WebGL2RenderingContext;
    private static _worldProgram: WebGLProgram;
    private static _positionAttr: WGL.Attribute;
    private static _viewMat: WGL.Uniform;
    static _shaderInit = (()=>{
        registerPrecompileCallback(gl => {
            const worldVS = WGL.createShader(gl, gl.VERTEX_SHADER, worldVSource);
            const worldFS = WGL.createShader(gl, gl.FRAGMENT_SHADER, worldFSource);
            Renderer._ctx = gl;
            Renderer._worldProgram = WGL.createProgram(gl, worldVS, worldFS);
            Renderer._positionAttr = new WGL.Attribute(gl, this._worldProgram, 'a_position');
            Renderer._viewMat = new WGL.Uniform(gl, Renderer._worldProgram, 'u_viewMat', WGL.Uniform_Types.MAT3);
            return true;
        });
    })();

    private _vao: WebGLVertexArrayObject;

    constructor(onResize: InstanceType<typeof Environment>['onResize']){
        const gl = Renderer._ctx;
        this._vao = WGL.nullError(gl.createVertexArray(), new Error('Error creating vertex array object'));
        gl.bindVertexArray(this._vao);
        Renderer._positionAttr.set(new Float32Array(WGL.createPlaneGeo()), 2, gl.FLOAT);

        onResize.addListener(this.resize.bind(this));
    }

    get canvas(){return Renderer._ctx.canvas}

    resize(): void {
        const gl = Renderer._ctx;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    render(objects: Object_Base[], viewMat: Mat3): void {
        const gl = Renderer._ctx;

        //render world background
        gl.bindVertexArray(this._vao);
        gl.useProgram(Renderer._worldProgram);
        Renderer._viewMat.set(false, viewMat.data);
        Renderer._positionAttr.enable();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        Renderer._positionAttr.disable();

        //draw all objects
        for (let i = 0; i < objects.length; i++){
            objects[i].render(viewMat);
        }
    }
}