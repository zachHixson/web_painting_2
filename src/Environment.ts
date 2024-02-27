import Mouse from "./Mouse";
import Camera from "./objects/Camera";
import Renderable from "./objects/Renderable";
import EventEmitter from "./lib/EventEmitter";
import { ConstVector, Vector } from "./lib/Vector";

export default class Environment {
    readonly ctx: WebGL2RenderingContext;
    readonly camera: Camera;
    readonly mouse: Mouse;
    readonly renderList: Renderable[] = [];

    readonly onResize = new EventEmitter<(dimensions: ConstVector)=>void>();

    constructor(ctx: WebGL2RenderingContext){
        this.ctx = ctx;
        this.camera = new Camera(this.onResize);
        this.mouse = new Mouse(this.ctx.canvas as HTMLCanvasElement, this.camera, this.onResize);

        window.addEventListener('resize', this.resize.bind(this));
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
}