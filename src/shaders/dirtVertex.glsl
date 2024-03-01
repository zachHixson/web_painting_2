#version 300 es

uniform sampler2D u_xfrm;
uniform mat3 u_viewMat;

in vec2 a_planeGeo;

out vec2 v_uv;

void main(){
    v_uv = (a_planeGeo + 1.0) / 2.0;
    ivec2 xfrmTexSize = textureSize(u_xfrm, 0);
    ivec2 texCoord = ivec2(
        mod(float(gl_InstanceID), float(xfrmTexSize.x)),
        floor(float(gl_InstanceID) / float(xfrmTexSize.y))
    );
    vec4 xfrm = texelFetch(u_xfrm, texCoord, 0);
    vec2 pos = (a_planeGeo * 50.0) + xfrm.xy;
    pos = (vec3(pos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(pos, 0.0), 1.0);
}