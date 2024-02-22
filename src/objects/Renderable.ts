import { Mat3 } from "../lib/Mat3";

export default interface Renderable {
    render(gl: WebGL2RenderingContext, viewMat: Mat3): void;
}