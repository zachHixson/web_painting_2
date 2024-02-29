import Mouse from "./Mouse";
import Camera from "./Camera";
import EventEmitter from "./lib/EventEmitter";
import { ConstVector, Vector } from "./lib/Vector";
import Renderer from "./Renderer";
import Object_Base from "./objects/Object_Base";

export default class Environment {
    static readonly SIZE = 8192;

    readonly ctx: WebGL2RenderingContext;
    readonly camera: Camera;
    readonly mouse: Mouse;
    private readonly renderer: Renderer;
    private readonly objectList: Object_Base[] = [];

    readonly onResize = new EventEmitter<(dimensions: ConstVector)=>void>();

    constructor(ctx: WebGL2RenderingContext){
        this.ctx = ctx;
        this.camera = new Camera(this.onResize);
        this.mouse = new Mouse(this.ctx.canvas as HTMLCanvasElement, this.camera, this.onResize);
        this.renderer = new Renderer(this.onResize);

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();

        this.mouse.onCommit.addListener((createObj, points) => {
            const obj = new createObj(points, this);
            obj.onExpire.addListener(()=>{
                const idx = this.objectList.findIndex(i => i == obj);
                this.objectList.splice(idx, 1);
            });
            this.objectList.push(obj);
        });
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

    render(): void {
        this.renderer.render(this.objectList, this.camera.getInvMatrix());
        this.mouse.render();
    }
}