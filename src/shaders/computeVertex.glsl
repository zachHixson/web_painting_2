#version 300 es

uniform float u_delta;

in vec2 a_planeGeo;

out vec2 v_uv;

void main(){
    v_uv = (a_planeGeo + 1.0) / 2.0;
    gl_Position = vec4(vec3(a_planeGeo, 0.0), 1.0);
}