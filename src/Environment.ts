import Mouse from "./Mouse";
import Camera from "./objects/Camera";
import Renderable from "./objects/Renderable";

export default class Environment {
    readonly mouse;
    readonly camera = new Camera();
    readonly renderList: Renderable[] = [];

    constructor(ctx: WebGL2RenderingContext){
        this.mouse = new Mouse(ctx.canvas as HTMLCanvasElement, this.camera);
    }
}