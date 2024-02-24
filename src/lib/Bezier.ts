import { ConstVector, Vector } from "./Vector";

const SMOOTH_FACTOR = 3;

export function splineFromPoints(points: ConstVector[]): Vector[]{
    if (points.length < 2){
        return [];
    }

    const tangents = new Array(points.length);
    const handles = new Array(points.length * 2 - 2);
    const bezierPoints = new Array(points.length + handles.length);
    const smoothFac = 1 / SMOOTH_FACTOR;

    //compute tangents (except first and last)
    for (let i = 1; i < points.length - 1; i++){
        const prev = points[i - 1];
        const next = points[i + 1];
        const tangent = next.clone().subtract(prev).normalize();
        tangents[i] = tangent;
    }

    //compute handles (except first and last)
    for (let i = 1; i < points.length - 1; i++){
        const nextHandleIdx = i * 2;
        const prevHandleIdx = nextHandleIdx - 1;
        const prevLength = points[i].distanceTo(points[i - 1]);
        const nextLength = points[i].distanceTo(points[i + 1]);
        const prevHandle = points[i].clone().subtract(tangents[i].clone().scale(prevLength * smoothFac));
        const nextHandle = points[i].clone().add(tangents[i].clone().scale(nextLength * smoothFac));

        handles[prevHandleIdx] = prevHandle;
        handles[nextHandleIdx] = nextHandle;
    }

    //compute first and last handle
    if (points.length > 2){
        const h1Delta = handles[1].clone().subtract(points[0]);
        const h2Delta = handles[handles.length - 2].clone().subtract(points[points.length - 1]);
        handles[0] = points[0].clone().add(h1Delta.scale(smoothFac));
        handles[handles.length - 1] = points[points.length - 1].clone().add(h2Delta.scale(smoothFac));
    }
    else{
        handles[0] = points[0];
        handles[1] = points[1];
    }

    //interleave points and handles
    for (let i = 0; i < points.length - 1; i++){
        const idx = i * 3;
        const handleIdx = i * 2;
        bezierPoints[idx + 0] = points[i];
        bezierPoints[idx + 1] = handles[handleIdx];
        bezierPoints[idx + 2] = handles[handleIdx + 1];
    }
    bezierPoints[bezierPoints.length - 1] = points[points.length - 1];

    return bezierPoints;
}

const vectorCache = {
    p0: new Vector(),
    p1: new Vector(),
    p2: new Vector(),
    p3: new Vector(),
}

export function pointFromCurve(curve: ConstVector[], t: number): Vector {
    const p0 = vectorCache.p0.copy(curve[0]);
    const p1 = vectorCache.p1.copy(curve[1]);
    const p2 = vectorCache.p2.copy(curve[2]);
    const p3 = vectorCache.p3.copy(curve[3]);
    const t2 = t * t;
    const t3 = t2 * t;

    return p0.scale(-t3 + 3 * t2 - 3 * t + 1)
        .add(p1.scale(3 * t3 - 6 * t2 + 3 * t))
        .add(p2.scale(-3 * t3 + 3 * t2))
        .add(p3.scale(t3))
        .clone();
}

export function velocityFromCurve(curve: ConstVector[], t: number): Vector {
    const p0 = vectorCache.p0.copy(curve[0]);
    const p1 = vectorCache.p1.copy(curve[1]);
    const p2 = vectorCache.p2.copy(curve[2]);
    const p3 = vectorCache.p3.copy(curve[3]);
    const t2 = t * t;

    return p0.scale(-3 * t2 + 6 * t - 3)
        .add(p1.scale(9 * t2 - 12 * t + 3))
        .add(p2.scale(-9 * t2 + 6 * t))
        .add(p3.scale(3 * t2))
        .clone();
}

export function accelerationFromCurve(curve: ConstVector[], t: number): Vector {
    const p0 = vectorCache.p0.copy(curve[0]);
    const p1 = vectorCache.p1.copy(curve[1]);
    const p2 = vectorCache.p2.copy(curve[2]);
    const p3 = vectorCache.p3.copy(curve[3]);

    return p0.scale(-6 * t + 6)
        .add(p1.scale(18 * t - 12))
        .add(p2.scale(-18 * t + 6))
        .add(p3.scale(6 * t))
        .clone();
}

export function curvatureFromCurve(curve: ConstVector[], t: number): number {
    const vel = velocityFromCurve(curve, t);
    const acc = accelerationFromCurve(curve, t);
    const det = vel.cross(acc);
    const velMag = acc.length();

    return det / (velMag * velMag * velMag);
}

export function curveExtrema(curve: ConstVector[]): number[] {
    //Calculate X roots
    const xSame = curve[1].x == curve[2].x;
    const ax = -3 * curve[0].x + 9 * curve[1].x - 9 * curve[2].x + 3 * curve[3].x;
    const bx = 6 * curve[0].x - 12 * curve[1].x + 6 * curve[2].x;
    const cx = -3 * curve[0].x + 3 * curve[1].x;
    const sx = Math.sqrt(bx * bx - 4 * ax * cx);
    const x1 = xSame ? 0.5 : (-bx + sx) / (2 * ax);
    const x2 = (-bx - sx) / (2 * ax);

    //Calculate y roots
    const ySame = curve[1].y == curve[2].y;
    const ay = -3 * curve[0].y + 9 * curve[1].y - 9 * curve[2].y + 3 * curve[3].y;
    const by = 6 * curve[0].y - 12 * curve[1].y + 6 * curve[2].y;
    const cy = -3 * curve[0].y + 3 * curve[1].y;
    const sy = Math.sqrt(by * by - 4 * ay * cy);
    const y1 = ySame ? 0.5 : (-by + sy) / (2 * ay);
    const y2 = (-by - sy) / (2 * ay);

    return [x1, x2, y1, y2];
}

export function boundsFromCurve(curve: ConstVector[], padding: number = 0): {ul: Vector, br: Vector} {
    const extrema = curveExtrema(curve);
    const ul = new Vector(
        Math.min(curve[0].x, curve[3].x),
        Math.max(curve[0].y, curve[3].y)
    );
    const br = new Vector(
        Math.max(curve[0].x, curve[3].x),
        Math.min(curve[0].y, curve[3].y)
    );

    for (let i = 0; i < extrema.length; i++){
        const e = extrema[i];

        if (e < 0 || e > 1 || Math.abs(e) == Infinity || isNaN(e)){
            continue;
        }

        const point = pointFromCurve(curve, e);
        ul.x = Math.min(ul.x, point.x);
        ul.y = Math.max(ul.y, point.y);
        br.x = Math.max(br.x, point.x);
        br.y = Math.min(br.y, point.y);
    }

    ul.x -= padding;
    ul.y += padding;
    br.x += padding;
    br.y -= padding;

    return {ul, br};
}