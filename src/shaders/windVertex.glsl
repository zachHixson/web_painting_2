#version 300 es

#define GEO_SIZE 72

uniform mat3 u_viewMat;
uniform int u_dataTexWidth;
uniform int u_wispGeo[GEO_SIZE];
uniform highp isampler2D u_dataTex;

out float v_randSeed;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

void main(){
    ivec2 dataCoord = ivec2(
        gl_InstanceID % u_dataTexWidth,
        gl_InstanceID / u_dataTexWidth
    );
    ivec4 dataRead = texelFetch(u_dataTex, dataCoord, 0);
    vec2 instPos = vec2(dataRead.xy);

    //Position of (0,0) means the instance is "inactive."
    if (instPos == vec2(0.0) && gl_InstanceID > 100){
        gl_Position = vec4(0.0);
        return;
    }

    v_randSeed = random2D(instPos) * 13.1235;

    float vertId = float(gl_InstanceID) + mod(float(gl_VertexID), 3.0);
    int geoIdx = int(mod(vertId * 2.0, float(GEO_SIZE)));
    int geoPos = u_wispGeo[geoIdx + 1];
    vec2 vertPos = vec2(u_wispGeo[geoIdx] * 100, geoPos * 20);
    vertPos = (vec3(vertPos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(vertPos, 0.0), 1.0);
}