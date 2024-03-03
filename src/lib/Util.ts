import { Vector } from "./Vector";

export interface Rect {
    min: Vector;
    max: Vector;
}

export function rectIntersect(r1: Rect, r2: Rect): boolean {
    const c1 = r1.min.x > r2.max.x;
    const c2 = r1.max.x < r2.min.x;
    const c3 = r1.min.y > r2.max.y;
    const c4 = r1.max.y < r2.min.y;

    if (c1 || c2 || c3 || c4) return false;

    return true;
}