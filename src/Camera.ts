import { ConstVector, Vector } from './lib/Vector';
import { Mat3 } from './lib/Mat3';
import EventEmitter from './lib/EventEmitter';
import Environment from './Environment';
import * as Util from './lib/Util';

export default class Camera {
    private _pos = new Vector(0, 0);
    private _scale = 1;
    private _dimensions = new Vector(0, 0);
    private _mat = new Mat3();
    private _invMat = new Mat3();
    private _matrixNeedsUpdate = false;
    private _screenBounds: Util.Rect = {min: new Vector(), max: new Vector()};

    constructor(onResize: EventEmitter<(dimensions: ConstVector)=>void>){
        onResize.addListener(this.setDimensions.bind(this));
    }

    private _checkBounds(): void {
        const camBounds = this.getScreenBounds();

        //correct position if out of bounds
        const dx = Math.max(-Environment.SIZE - camBounds.min.x, 0.0) + Math.min(Environment.SIZE - camBounds.max.x, 0.0);
        const dy = Math.max(-Environment.SIZE - camBounds.min.y, 0.0) + Math.min(Environment.SIZE - camBounds.max.y, 0.0);

        if (dx != 0 || dy != 0){
            this._pos.x += dx;
            this._pos.y += dy;
            this._matrixNeedsUpdate = true;
        }
    }

    getScreenBounds(): Util.Rect {
        if (this._matrixNeedsUpdate) this.updateMatrix();
        return this._screenBounds;
    }

    getPos(): ConstVector {
        return this._pos;
    }

    getScale(): number {
        return this._scale;
    }

    getDimensions(): ConstVector {
        return this._dimensions;
    }

    setDimensions(dimensions: ConstVector): void {
        this._dimensions.copy(dimensions);
        this._matrixNeedsUpdate = true;
    }

    getMatrix(): Mat3 {
        if (this._matrixNeedsUpdate){
            this.updateMatrix();
        }

        return this._mat;
    }

    getInvMatrix(): Mat3 {
        if (this._matrixNeedsUpdate){
            this.updateMatrix();
        }

        return this._invMat;
    }

    setPos(pos: ConstVector): void {
        this._pos.copy(pos);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    slide(velocity: ConstVector): void {
        this._pos.add(velocity);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    setScale(scale: number): void {
        this._scale = scale;
        this._scale = Math.max(Math.min(this._scale, 2), 0.1);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    zoom(amount: number): void {
        this._scale += amount;
        this._scale = Math.max(Math.min(this._scale, 2), 0.7);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    updateMatrix(): void {
        //update matrix
        const scaleMat = new Mat3([this._scale, 0, 0, 0, this._scale, 0, 0, 0, 1]);
        const xlateMat = new Mat3([1, 0, -this._pos.x, 0, 1, -this._pos.y, 0, 0, 1]);
        const aspectMat = new Mat3([
            1 / this._dimensions.x, 0, 0,
            0, 1 / this._dimensions.y, 0,
            0, 0, 1
        ]);
        this._mat.copy(scaleMat.multiply(aspectMat).multiply(xlateMat));
        this._invMat.copy(this._mat).inverse();

        //update screen bounds
        const mat = this._invMat.clone().transpose();
        this._screenBounds.min.set(-1, -1).multiplyMat3(mat);
        this._screenBounds.max.set(1, 1).multiplyMat3(mat);

        this._matrixNeedsUpdate = false;
    }
}