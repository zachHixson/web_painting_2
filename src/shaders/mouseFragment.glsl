#version 300 es
precision highp float;

flat in vec4 v_endPoints;
flat in vec4 v_controlPoints;

out vec4 outColor;

const int STEPS = 10;

float lineSDF(vec2 ro, vec2 p0, vec2 p1){
    vec2 rayDir = ro - p0;
    vec2 lineDir = p1 - p0;
    float d1 = dot(rayDir, lineDir);
    float d2 = dot(lineDir, lineDir);
    float clamped = max(min(d1 / d2, 1.0), 0.0);
    return length(rayDir - lineDir * clamped);
}

vec2 bezierPoint(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t){
    float t2 = t * t;
    float t3 = t2 * t;

    return p0 * (-t3 + 3.0 * t2 - 3.0 * t + 1.0) +
           p1 * (3.0 * t3 - 6.0 * t2 + 3.0 * t) +
           p2 * (-3.0 * t3 + 3.0 * t2) +
           p3 * (t3);
}

float bezier(vec2 ro, vec2 p0, vec2 p1, vec2 p2, vec2 p3){
    float dTime = 1.0 / float(STEPS);
    float total = 1.0;

    for (int i = 0; i < STEPS; i++){
        float t = float(i) * dTime;
        vec2 l1 = bezierPoint(p0, p1, p2, p3, t);
        vec2 l2 = bezierPoint(p0, p1, p2, p3, t + dTime);
        float line = lineSDF(ro, l1, l2) - 5.0;
        total = min(total, line);
    }

    return total;
}

void main(){
    vec2 p0 = v_endPoints.xy;
    vec2 p1 = v_controlPoints.xy;
    vec2 p2 = v_controlPoints.zw;
    vec2 p3 = v_endPoints.zw;

    float dist1 = distance(p0, gl_FragCoord.xy) / 10.0;
    float dist4 = distance(p3, gl_FragCoord.xy) / 10.0;

    float dots = smoothstep(1.0, 0.8, min(dist1, dist4));

    float bezier = 1.0 - bezier(gl_FragCoord.xy, p0, p1, p2, p3);

    vec3 outCol = mix(vec3(1.0, 0.4, 0.4), vec3(1.0), dots);
    float outMask = min(max(bezier, dots), 1.0);

    outColor = vec4(outCol, outMask);
}