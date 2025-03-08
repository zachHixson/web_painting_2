#version 300 es
precision highp int;
precision highp float;

uniform int u_dataTexWidth;
uniform highp isampler2D u_dataTex;
uniform float u_delta;

in vec2 v_uv;

out ivec4 outColor;

void main(){
    ivec4 dataRead = texelFetch(u_dataTex, ivec2(v_uv * float(u_dataTexWidth)), 0);

    if (dataRead.xy == ivec2(0.0)) {
        outColor = dataRead;
        return;
    }

    outColor = ivec4(dataRead.xy, dataRead.z + int(u_delta * 1000.0), 0.0);
}