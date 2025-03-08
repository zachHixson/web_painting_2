import type Environment from "../Environment";
import { TOOLS } from "./Tools_Enum";
import Tool_Base from "./Tool_Base";
import { ConstVector } from "../lib/Vector";

export default class Move extends Tool_Base {
    constructor(id: TOOLS, icon: string, env: Environment) {
        super(id, icon, env);

        this._env.onToolSet.addListener(newTool => {
            this._env.mouse.enableDrawing = newTool != this.id;
        });
    }

    mouseMoveHandler = (isDown: boolean, delta: ConstVector, _: boolean): void => {
        if (!isDown) return;
        this._env.camera.slide(delta);
    }

    update(): void {}
    render(): void {}
}