#version 300 es

#define INST_VERT_COUNT 36
#define TRI_COUNT 12
#define WIDTH 5.0

uniform mat3 u_viewMat;
uniform int u_dataTexWidth;
uniform highp isampler2D u_dataTex;

out float v_randSeed;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

ivec2 idxToDataCoord(int idx) {
    return ivec2(
        idx % u_dataTexWidth,
        idx / u_dataTexWidth
    );
}

ivec4 getPtData(int triIdx, bool isReversed) {
    /*
        Since the wind wisp is basically a triangle strip, each vertex needs to sample
        a point on the wisp relative to it's position on the strip.
            * Every triangle has a "base," and a "tip."
            * The "base," points need to sample with 0 offset, while the "tip," points need to sample with +1 offset
            * The previous rule is reversed for the odd number triangles that start with the tip and end with the base.
        The following truth table demonstrates the rules:
            * r = reversed, t = tip, o = idx offset

        r t o
        0 0 0
        0 1 1
        1 0 1
        1 1 0

        this is equivilent to a single XOR
    */
    int instanceIdx = gl_InstanceID * 8;
    int baseIdx = (gl_VertexID + 3) / 6;
    bool isTip = gl_VertexID % 3 == 0;
    int offset = int(isReversed ^^ isTip);
    int dataIdx = instanceIdx + baseIdx + offset;

    return texelFetch(u_dataTex, idxToDataCoord(dataIdx), 0);
}

void main(){
    vec2 tan;
    vec3 vertPos;
    ivec4 ptData;
    float reverseTan;

    int triIdx = gl_VertexID / 3;
    bool isReversed = triIdx % 2 == 0;
    bool isCentered = gl_VertexID == 0 || gl_VertexID == INST_VERT_COUNT - 3;

    ptData = getPtData(triIdx, isReversed);

    //every other triangle should be reversed, starting with reversed
    reverseTan = float(triIdx % 2 == 0) * 2.0 - 1.0;

    //center the vertex if it's on the tip of the wisp
    reverseTan *= float(!isCentered);

    //rotate the tangent offset based on position in triangle
    if (gl_VertexID % 3 != 1) {
        tan = vec2(
            intBitsToFloat(ptData.w),
            -intBitsToFloat(ptData.z)
        ); //rotate tan 90deg CW
    }
    else {
        tan = vec2(
            -intBitsToFloat(ptData.w),
            intBitsToFloat(ptData.z)
        ); //rotate tan 90deg CCW
    }

    //set world vertex position
    vertPos = vec3(ptData.xy, 1.0);
    vertPos.xy += tan * reverseTan * WIDTH;

    //view xfrm
    vertPos = vertPos * u_viewMat;

    gl_Position = vec4(vertPos, 1.0);
}
