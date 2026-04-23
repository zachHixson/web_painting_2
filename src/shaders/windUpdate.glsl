#version 300 es
precision highp int;
precision highp float;

uniform int u_dataTexWidth;
uniform highp isampler2D u_dataTex;
uniform float u_delta;

out ivec4 outColor;

#define PI 3.141592653589793

const float MAX_32I = pow(2.0, 24.0) / 2.0; //NOTE: Should probably replace this with reinterpret_cast (or similar) in relevant files

float rand(vec2 seed){
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 pt) {
    vec2 p1 = floor(pt);
    vec2 p2 = p1 + vec2(1, 0);
    vec2 p3 = p1 + vec2(1, 1);
    vec2 p4 = p1 + vec2(0, 1);

    float r1 = rand(p1);
    float r2 = rand(p2);
    float r3 = rand(p3);
    float r4 = rand(p4);

    vec2 t = vec2(fract(pt.x), fract(pt.y));
    float v1 = mix(r1, r2, t.x);
    float v2 = mix(r4, r3, t.x);

    return mix(v1, v2, t.y);
}

vec2 rotateVec2(vec2 inVec, float rad) {
    return vec2(
        inVec.x * cos(rad) - inVec.y * sin(rad),
        inVec.x * sin(rad) + inVec.y * cos(rad)
    );
}

void main(){
    int ptIdx = int(gl_FragCoord.x) + int(gl_FragCoord.y) * u_dataTexWidth;
    bool isLeader = (ptIdx + 1) % 8 == 0;
    float nxOffset = 1.0 - float(isLeader) * 2.0;
    ivec4 ptRead = texelFetch(u_dataTex, ivec2(gl_FragCoord.xy), 0);
    ivec4 nxRead = texelFetch(u_dataTex, ivec2(gl_FragCoord.x + nxOffset, gl_FragCoord.y), 0);
    ivec4 write = ivec4(0, 0, 0, 0);
    ivec2 diff = nxRead.xy - ptRead.xy;
    vec2 dir;

    //get new direction
    if (isLeader) {
        float rotDir = 2.0 * noise(vec2(ptRead.xy) * 0.01) - 1.0;
        dir = vec2(nxRead.zw) / MAX_32I;
        dir = rotateVec2(dir, 0.5 * rotDir);
    }
    else {
        dir = normalize(vec2(diff));
    }

    //set write data
    write.xy = ptRead.xy + ivec2(dir * 10.0);
    write.zw = ivec2(dir * MAX_32I);

    //remove wisps that are too short
    if (length(vec2(diff)) < 10.0 && isLeader) {
        //write = ivec4(0); //Currently doesn't work right, so is commented out
    }

    //write output
    if (ptRead == ivec4(0)) {
        outColor = ivec4(0);
    }
    else {
        outColor = write;
    }
}
