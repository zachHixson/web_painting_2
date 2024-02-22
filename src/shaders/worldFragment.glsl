#version 300 es
precision highp float;

in vec2 v_uv;

out vec4 outColor;

const vec3 BG_COLOR = vec3(0.89, 0.89, 0.84);
const vec3 GRID_COLOR = vec3(1.0);

void main(){
    vec2 tUv = fract(v_uv / 100.0);
    tUv -= 0.5;
    tUv = abs(tUv) * 2.0;

    float grid = max(tUv.x, tUv.y);
    grid -= 0.95;
    grid = smoothstep(0.0, 0.05, grid);

    vec3 col = mix(BG_COLOR, GRID_COLOR, grid * 0.5);

    outColor = vec4(col, 1.0);

    //debug code. Remove before launching
    float dbgDist = length(v_uv);

    if (dbgDist < 10.0){
        outColor = vec4(vec3(0.0), 1.0);
    }
}