#version 300 es

uniform mat3 u_viewMat;

in vec4 a_position;

out vec2 v_uv;

void main(){
    v_uv = (vec3(a_position.xy, 1.0) * u_viewMat).xy;
    gl_Position = a_position;
}