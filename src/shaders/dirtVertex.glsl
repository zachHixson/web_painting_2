#version 300 es

uniform float u_backAnim;
uniform mat3 u_viewMat;

in vec2 a_planeGeo;
in vec2 a_pos;

out vec2 v_uv;
out float v_randSeed;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

void main(){
    v_uv = (a_planeGeo + 1.0) / 2.0;
    v_randSeed = random2D(a_pos) * 13.1235;

    float scale = 50.0 * u_backAnim;
    vec2 pos = (a_planeGeo * scale) + a_pos;
    pos = (vec3(pos, 1.0) * u_viewMat).xy;

    gl_Position = vec4(vec3(pos, 0.0), 1.0);
}