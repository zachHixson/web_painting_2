#version 300 es
precision highp float;

uniform bool u_erase;

out vec4 outColor;

void main(){
    float col = 1.0;

    if (u_erase) {
        col = 0.0;
    }

    outColor = vec4(col);
}