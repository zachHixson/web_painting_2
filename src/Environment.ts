import Mouse from "./Mouse";
import Camera from "./Camera";
import EventEmitter from "./lib/EventEmitter";
import { ConstVector, Vector } from "./lib/Vector";
import Renderer, { PrecompileCallback } from "./Renderer";
import * as WGL from "./lib/wgl";
import RenderPass from "./lib/RenderPass";
import worldVSource from './shaders/worldVertex.glsl?raw';
import worldFSource from './shaders/worldFragment.glsl?raw';
import Object_Base from "./objects/Object_Base";

/**
 * Manages objects and world state
 */
export default class Environment {
    static readonly SIZE = 8192;

    //Properties
    private readonly _renderPass: RenderPass;
    private readonly _renderer: Renderer;
    private readonly _objectList: Object_Base[] = [];
    private _lastFrameTime = 0;
    readonly ctx: WebGL2RenderingContext;
    readonly camera: Camera;
    readonly mouse: Mouse;

    //Compute data buffers
    readonly dirtBuffer: WebGLTexture;

    //Events
    readonly onResize = new EventEmitter<(dimensions: ConstVector)=>void>();

    constructor(ctx: WebGL2RenderingContext, precompileCallbacks?: PrecompileCallback[]){
        this.ctx = ctx;
        this.camera = new Camera(this.onResize);
        this._renderPass = this._setupRenderPass();
        this._renderer = new Renderer(this.ctx, this.onResize);

        if (precompileCallbacks) {
            this._renderer.precompilePrograms(precompileCallbacks);
        }

        this.mouse = new Mouse(this, this.camera, this.onResize);

        this.dirtBuffer = new WGL.Render_Texture(this.ctx, 512, 512, false);

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();

        this.mouse.onCommit.addListener((createObj, points) => {
            const obj = new createObj(points, this);
            obj.onExpire.addListener(()=>{
                const idx = this._objectList.findIndex(i => i == obj);
                this._objectList.splice(idx, 1);
            });
            this._objectList.push(obj);
        });

        this._lastFrameTime = performance.now();
    }

    private _setupRenderPass(): RenderPass {
        const gl = this.ctx;
        const modifiedFSrc = worldFSource.replace('${WORLD_SIZE}', Environment.SIZE.toString());
        const worldVS = WGL.createShader(gl, gl.VERTEX_SHADER, worldVSource);
        const worldFS = WGL.createShader(gl, gl.FRAGMENT_SHADER, modifiedFSrc);
        const vao = WGL.nullError(gl.createVertexArray(), new Error('Error creating vertex array object'));
        const program = WGL.createProgram(gl, worldVS, worldFS);

        gl.bindVertexArray(vao);
        gl.useProgram(program);

        const renderPass = new RenderPass({
            gl,
            vao,
            program,
            uniforms: {
                viewMat: new WGL.Uniform(gl, program, 'u_viewMat', WGL.Uniform_Types.MAT3),
            },
            attributes: {
                positionAttr: (()=>{
                    const attr = new WGL.Attribute(gl, program, 'a_position');
                    attr.set(new Float32Array(WGL.createPlaneGeo()), 2, gl.FLOAT);
                    return attr;
                })(),
            }
        });

        return renderPass;
    }

    /**
     * Gets a WebGL shader program from the renderer if already compiled, or compiles that program if not
     */
    getProgram(id: symbol, compileCallback: PrecompileCallback): WebGLProgram {
        const program = this._renderer.getProgram(id);

        if (!program) {
            return this._renderer.compileProgram(compileCallback).program;
        }

        return program;
    }

    /**
     * Resizes the canvas, then emits the "onResize," event
     */
    resize(): void {
        const canvas = this.ctx.canvas as HTMLCanvasElement;
        const parentBounds = canvas.parentElement!.getBoundingClientRect();
        const width = parentBounds.width;
        const height = parentBounds.height;

        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        this.onResize.emit(new Vector(canvas.width, canvas.height));
    }

    /**
     * Updates world state and all child objects
     */
    update(): void {
        const now = performance.now();
        const delta = (now - this._lastFrameTime) / 1000;

        for (let i = 0; i < this._objectList.length; i++){
            this._objectList[i].update(delta);
        }

        this._lastFrameTime = now;
    }

    /**
     * Renders all child objects and mouse preview path
     */
    render(): void {
        this._renderPass.enable();
        this._renderPass.uniforms!.viewMat.set(false, this.camera.getInvMatrix().data);
        this.ctx.drawArrays(this.ctx.TRIANGLES, 0, 6);
        this._renderPass.disable();

        this._renderer.render(this._objectList, this.camera.getMatrix(), this.camera.getInvMatrix());
        this.mouse.render();
    }
}