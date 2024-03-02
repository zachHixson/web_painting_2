#version 300 es

uniform mat3 u_viewMat;

in vec2 a_planeGeo;
in vec2 a_pos;

out vec2 v_uv;

void main(){
    v_uv = (a_planeGeo + 1.0) / 2.0;
    vec2 pos = (a_planeGeo * 50.0) + a_pos;
    pos = (vec3(pos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(pos, 0.0), 1.0);
}