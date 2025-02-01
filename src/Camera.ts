import { ConstVector, Vector } from './lib/Vector';
import { Mat3 } from './lib/Mat3';
import EventEmitter from './lib/EventEmitter';
import Environment from './Environment';
import * as Util from './lib/Util';

/**
 * A 2D camera for use with a WebGL renderer
 */
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

    /**
     * Returns the world space bounds of the screen
     */
    getScreenBounds(): Util.Rect {
        if (this._matrixNeedsUpdate) this.updateMatrix();
        return this._screenBounds;
    }

    /**
     * Returns the world space coordinates of the camera
     */
    getPos(): ConstVector {
        return this._pos;
    }

    /**
     * Returns the world space scale of the camera
     */
    getScale(): number {
        return this._scale;
    }

    /**
     * Returns the camera space width/height of the camera bounds
     */
    getDimensions(): ConstVector {
        return this._dimensions;
    }

    /**
     * Sets the camera space dimensions of the camera
     */
    setDimensions(dimensions: ConstVector): void {
        this._dimensions.copy(dimensions);
        this._matrixNeedsUpdate = true;
    }

    /**
     * Returns the view matrix to be used in WebGL rendering
     */
    getMatrix(): Mat3 {
        if (this._matrixNeedsUpdate){
            this.updateMatrix();
        }

        return this._mat;
    }

    /**
     * Returns the inverse of the view matrix to be used in WebGL rendering
     */
    getInvMatrix(): Mat3 {
        if (this._matrixNeedsUpdate){
            this.updateMatrix();
        }

        return this._invMat;
    }

    /**
     * Sets the world space position of the camera
     */
    setPos(pos: ConstVector): void {
        this._pos.copy(pos);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    /**
     * Offsets the camera position in world space by provided vector
     */
    slide(velocity: ConstVector): void {
        this._pos.add(velocity);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    /**
     * Sets the world space scale of the camera
     */
    setScale(scale: number): void {
        this._scale = scale;
        this._scale = Math.max(Math.min(this._scale, 2), 0.1);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    /**
     * Offsets the scale by the provided amount
     */
    zoom(amount: number): void {
        this._scale += amount;
        this._scale = Math.max(Math.min(this._scale, 2), 0.7);
        this._matrixNeedsUpdate = true;
        this._checkBounds();
    }

    /**
     * Updates the stored transformation matrix and inv matrix
     */
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