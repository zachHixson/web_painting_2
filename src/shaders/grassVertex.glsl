#version 300 es

const int bladeCount = 10;

uniform mat3 u_viewMat;
uniform int u_dataTexWidth;
uniform float u_time;
uniform highp isampler2D u_dataTex;

in vec2 a_planeGeo;

out vec2 v_uv;
out float v_randSeed;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

void main(){
    int dirtID = gl_InstanceID / bladeCount;
    ivec2 dataCoord = ivec2(
        dirtID % u_dataTexWidth,
        dirtID / u_dataTexWidth
    );
    ivec4 dataRead = texelFetch(u_dataTex, dataCoord, 0);
    vec2 instPos = vec2(dataRead.xy);
    vec2 grassGeo = (a_planeGeo + vec2(0.0, 0.5)) * vec2(0.1, 1.5);

    //Position of (0,0) means the instance is "inactive."
    if (instPos == vec2(0.0)){
        gl_Position = vec4(0.0);
        return;
    }

    //offset each blade of grass
    instPos.x -= 50.0;
    instPos.x += (float(gl_InstanceID % bladeCount) / float(bladeCount)) * 50.0;
    instPos += random2D(vec2(gl_InstanceID, gl_InstanceID + dirtID)) * 20.0;
    instPos.y += 10.0;

    //calculate out vars
    v_uv = (a_planeGeo + 1.0) / 2.0;
    v_randSeed = random2D(instPos) * 13.1235;

    //offset top of grass
    grassGeo.x *= mix(1.0, 0.5, v_uv.y);
    grassGeo.x += (sin(float(gl_InstanceID)) + sin(u_time + instPos.x * 0.01 + instPos.y * 0.01)) * v_uv.y;

    vec2 vertPos = (grassGeo * 20.0) + instPos;
    vertPos = (vec3(vertPos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(vertPos, 0.0), 1.0);
}