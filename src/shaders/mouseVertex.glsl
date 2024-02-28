#version 300 es

in vec2 a_planeGeo;
in vec4 a_xfrm;
in vec4 a_endPoints;
in vec4 a_controlPoints;

uniform mat3 u_viewMatrix;

flat out vec4 v_endPoints;
flat out vec4 v_controlPoints;

void main(){
    vec2 offset = a_xfrm.xy;
    vec2 scale = a_xfrm.zw;
    vec2 pos = a_planeGeo * scale + offset;
    pos = (vec3(pos, 1.0) * u_viewMatrix).xy;
    pos = (pos * 2.0) - 1.0;

    v_endPoints = a_endPoints;
    v_controlPoints = a_controlPoints;

    gl_Position = vec4(pos, 1.0, 1.0);
}