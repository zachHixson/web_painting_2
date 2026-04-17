#version 300 es
precision highp int;
precision highp float;

uniform int u_dataTexWidth;
uniform highp isampler2D u_dataTex;
uniform float u_delta;

in vec2 v_uv;

out ivec4 outColor;

const float MAX_32I = pow(2.0, 32.0) / 2.0;

void main(){
    ivec4 dataRead = texelFetch(u_dataTex, ivec2(v_uv * float(u_dataTexWidth)), 0);
    vec2 dir = vec2(dataRead.zw) / MAX_32I;

    dataRead.xy += ivec2(dir * 5.0);

    outColor = dataRead;
}
