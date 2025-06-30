import Mouse from './Mouse';
import Camera from './Camera';
import EventEmitter from './lib/EventEmitter';
import { ConstVector, Vector } from './lib/Vector';
import Renderer from './Renderer';
import * as WGL from './lib/wgl';
import RenderPass from './lib/RenderPass';
import { Compute_Texture_Swap } from './lib/ComputeTexture';
import worldVSource from './shaders/worldVertex.glsl?raw';
import worldFSource from './shaders/worldFragment.glsl?raw';
import { TOOLS } from './Tools/Tools_Enum';
import Tool_Base from './Tools/Tool_Base';
import Move from './Tools/Move';
import Dirt from './Tools/Dirt';
import Wind from './Tools/Wind';

import placeHolderIcon from '/vite.svg';

/**
 * Manages objects and world state
 */
export default class Environment {
    static readonly SIZE = 8192;
    static readonly SIZE_INV = 1 / Environment.SIZE;

    //Properties
    private readonly _renderPass: RenderPass;
    private readonly _renderer: Renderer;
    private _lastFrameTime = 0;
    private _curTool: Tool_Base;
    readonly ctx: WebGL2RenderingContext;
    readonly camera: Camera;
    readonly mouse: Mouse;
    readonly tools: Tool_Base[];

    //Events
    readonly onResize = new EventEmitter<(dimensions: ConstVector)=>void>();
    readonly onToolSet = new EventEmitter<(newTool: TOOLS)=>void>();

    //Global compute textures
    readonly windBuffer: Compute_Texture_Swap;

    constructor(ctx: WebGL2RenderingContext){
        this.ctx = ctx;
        this.camera = new Camera(this.onResize);
        this._renderPass = this._setupRenderPass();
        this._renderer = new Renderer(this.ctx, this.onResize);
        this.tools = [
            new Move(TOOLS.MOVE, placeHolderIcon, this),
            new Dirt(TOOLS.DIRT, placeHolderIcon, this),
            new Wind(TOOLS.WIND, placeHolderIcon, this),
        ];
        this._curTool = this.tools[0];

        this.mouse = new Mouse(this, this.onResize);

        this.windBuffer = new Compute_Texture_Swap(this.ctx, 1024, this.ctx.RGBA32I, this.ctx.RGBA_INTEGER, this.ctx.INT, new Int32Array(1024 * 1024 * 4));

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();

        this.mouse.onMouseMove.addListener((_, delta, middleMouse)=>{
            if (!middleMouse) return;
            this.camera.slide(delta);
        });

        this.mouse.onMouseWheel.addListener(deltaY => {
            this.camera.zoom(-deltaY / 200);
        });

        this._lastFrameTime = performance.now();

        //!! debug code, remove
        //(window as any).setDebugTex(this.dirtBuffer.texture, 512, 512);
    }

    get curTool() {return this._curTool}

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
            },
        });

        return renderPass;
    }

    setTool(toolId: TOOLS): void {
        const newTool = this.tools.find(t => t.id == toolId);

        if (!newTool) {
            throw new Error('Unidentified tool ID ' + toolId);
        }

        //remove old event listeners
        this.mouse.onCommit.removeListener(this._curTool.mouseCommitHandler);
        this.mouse.onMouseMove.removeListener(this._curTool.mouseMoveHandler);

        this._curTool = newTool;

        this.mouse.onCommit.addListener(this._curTool.mouseCommitHandler);
        this.mouse.onMouseMove.addListener(this._curTool.mouseMoveHandler);

        this.onToolSet.emit(this._curTool.id);
    }

    /**
     * Adds a new wind gust to the global wind buffer
     */
    addWindGust(path: ConstVector[], directions: ConstVector[]): void {
        //
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

        for (let i = 0; i < this.tools.length; i++){
            this.tools[i].update(delta);
        }

        this._lastFrameTime = now;
    }

    /**
     * Renders all child objects and mouse preview path
     */
    render(): void {
        //draw environment background
        this._renderPass.enable();
        this._renderPass.uniforms!.viewMat.set(false, this.camera.getInvMatrix().data);
        this.ctx.drawArrays(this.ctx.TRIANGLES, 0, 6);
        this._renderPass.disable();

        //
        this._renderer.render(this.tools, this.camera.getMatrix(), this.camera.getInvMatrix());
        this.mouse.render();
    }
}