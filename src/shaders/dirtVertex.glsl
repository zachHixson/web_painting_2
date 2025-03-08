#version 300 es

uniform mat3 u_viewMat;
uniform int u_dataTexWidth;
uniform highp isampler2D u_dataTex;

in vec2 a_planeGeo;

out vec2 v_uv;
out float v_randSeed;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

float interpBack(float val) {
    const float c1 = 3.0;
    float c3 = c1 + 1.0;
    float vm1 = val - 1.0;

    return 1.0 + c3 * pow(vm1, 3.0) + c1 * pow(vm1, 2.0);
}

void main(){
    const float SPEED_DIV = 250.0;

    ivec2 dataCoord = ivec2(
        gl_InstanceID % u_dataTexWidth,
        gl_InstanceID / u_dataTexWidth
    );
    ivec4 dataRead = texelFetch(u_dataTex, dataCoord, 0);
    vec2 instPos = vec2(dataRead.xy);
    float backAnimProgress = min(float(dataRead.z) / SPEED_DIV, 1.0);
    float backAnim = interpBack(backAnimProgress);

    //Position of (0,0) means the instance is "inactive."
    if (instPos == vec2(0.0)){
        gl_Position = vec4(0.0);
        return;
    }

    v_uv = (a_planeGeo + 1.0) / 2.0;
    v_randSeed = random2D(instPos) * 13.1235;

    vec2 vertPos = (a_planeGeo * 50.0 * backAnim) + instPos;
    vertPos = (vec3(vertPos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(vertPos, 0.0), 1.0);
}