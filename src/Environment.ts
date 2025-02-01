import Mouse from "./Mouse";
import Camera from "./Camera";
import EventEmitter from "./lib/EventEmitter";
import { ConstVector, Vector } from "./lib/Vector";
import Renderer, { PrecompileCallback } from "./Renderer";
import Object_Base from "./objects/Object_Base";

export default class Environment {
    static readonly SIZE = 8192;

    private readonly _renderer: Renderer;
    private readonly _objectList: Object_Base[] = [];
    private _lastFrameTime = 0;
    readonly ctx: WebGL2RenderingContext;
    readonly camera: Camera;
    readonly mouse: Mouse;

    readonly onResize = new EventEmitter<(dimensions: ConstVector)=>void>();

    constructor(ctx: WebGL2RenderingContext, precompileCallbacks?: PrecompileCallback[]){
        this.ctx = ctx;
        this.camera = new Camera(this.onResize);
        this._renderer = new Renderer(this.ctx, this.onResize);

        if (precompileCallbacks) {
            this._renderer.precompilePrograms(precompileCallbacks);
        }

        this.mouse = new Mouse(this, this.camera, this.onResize);

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

    getProgram(id: symbol, compileCallback: PrecompileCallback): WebGLProgram {
        const program = this._renderer.getProgram(id);

        if (!program) {
            return this._renderer.compileProgram(compileCallback).program;
        }

        return program;
    }

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

    update(): void {
        const now = performance.now();
        const delta = (now - this._lastFrameTime) / 1000;

        for (let i = 0; i < this._objectList.length; i++){
            this._objectList[i].update(delta);
        }

        this._lastFrameTime = now;
    }

    render(): void {
        this._renderer.render(this._objectList, this.camera.getMatrix(), this.camera.getInvMatrix());
        this.mouse.render();
    }
}