#version 300 es
precision highp float;

in vec2 v_uv;

out vec4 outColor;

void main(){
    vec3 col = mix(
        vec3(0.4, 0.4, 0.2),
        vec3(0.0, 1.0, 0.0), 
        v_uv.y
    );
    outColor = vec4(col, 1.0);
}