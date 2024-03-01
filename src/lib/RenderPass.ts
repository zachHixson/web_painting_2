import * as WGL from './wgl';

interface iRenderPass {
    gl: WebGL2RenderingContext,
    vao: WebGLVertexArrayObject,
    program: WebGLProgram,
    uniforms?: {[key: string]: WGL.Uniform},
    attributes?: {[key: string]: WGL.Attribute},
    textures?: {[key: string]: WGL.Texture_Uniform},
}

export default class RenderPass implements iRenderPass {
    readonly gl: WebGL2RenderingContext;
    readonly vao: WebGLVertexArrayObject;
    readonly program: WebGLProgram;
    readonly uniforms?: {[key: string]: WGL.Uniform};
    readonly attributes?: {[key: string]: WGL.Attribute};
    readonly textures?: {[key: string]: WGL.Texture_Uniform};

    constructor(data: iRenderPass){
        this.gl = data.gl;
        this.vao = data.vao;
        this.program = data.program;
        this.uniforms = data.uniforms;
        this.attributes = data.attributes;
        this.textures = data.textures;
    }

    enable(){
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.useProgram(this.program);

        for (let i in this.attributes){
            this.attributes[i].enable();
        }

        for (let i in this.textures){
            this.textures[i].activate();
        }
    }

    disable(){
        for (let i in this.attributes){
            this.attributes[i].disable();
        }

        for (let i in this.textures){
            this.textures[i].deactivate();
        }
    }

    renderInstanced(count: number){
        const gl = this.gl;
        gl.drawArraysInstanced(
            gl.TRIANGLES,
            0,
            6,
            count
        );
    }
}