export default class EventEmitter<T extends (...args: any)=>any> {
    private _callbacks: T[] = [];

    addListener(callback: T): void {
        this._callbacks.push(callback);
    }

    removeListener(callback: T): void {
        const idx = this._callbacks.findIndex(val => val == callback);

        if (idx < 0) return;

        this._callbacks.splice(idx, 1);
    }

    emit(...data: Parameters<T>): void {
        for (let i = 0; i < this._callbacks.length; i++){
            this._callbacks[i](...data);
        }
    }
}