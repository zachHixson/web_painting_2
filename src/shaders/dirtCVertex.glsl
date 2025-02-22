#version 300 es

uniform mat3 u_viewMat;

in vec2 a_planeGeo;
in vec2 a_pos;

void main(){
    vec2 pos = a_planeGeo + a_pos;
    pos = (vec3(pos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(pos, 0.0), 1.0);
}