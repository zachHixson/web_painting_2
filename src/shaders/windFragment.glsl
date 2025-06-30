#version 300 es
precision highp float;

in float v_randSeed;

out vec4 outColor;

void main(){
    outColor = vec4(vec3(v_randSeed), 1.0);
}