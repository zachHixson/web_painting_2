import { Mat3 } from './lib/Mat3';
import Environment from './Environment';
import Tool_Base from './Tools/Tool_Base';

/**
 * A renderer for managing rendering context and rendering objects
 */
export default class Renderer {
    private _ctx: WebGL2RenderingContext;

    constructor(ctx: WebGL2RenderingContext, onResize: InstanceType<typeof Environment>['onResize']){
        this._ctx = ctx;

        onResize.addListener(this.resize.bind(this));
    }

    get canvas(){return this._ctx.canvas}

    /**
     * Resizes the main drawing context to the current size of it's canvas
     */
    resize(): void {
        const gl = this._ctx;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    /**
     * Renders a list of objects
     */
    render(tool: Tool_Base[], viewMat: Mat3, invViewMat: Mat3): void {
        //draw all objects
        for (let i = 0; i < tool.length; i++){
            tool[i].render(viewMat, invViewMat);
        }
    }
}