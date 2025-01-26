#version 300 es
precision highp float;

const vec3 DIRT_COL = vec3(0.8, 0.54, 0.35);

uniform float u_decay;

in vec2 v_uv;
in float v_randSeed;

out vec4 outColor;

float random2D(vec2 seed){
    return fract(sin(dot(seed, vec2(13.6016, 45.1407))) * 52469.9382);
}

float noise(vec2 uv){
    vec2 pUv = floor(uv * 10.0);
    vec2 tUv = fract(uv * 10.0);
    float rand = random2D(pUv);

    tUv = smoothstep(0.0, 1.0, tUv);

    float s1 = random2D(pUv);
    float s2 = random2D(pUv + vec2(0.0, 1.0));
    float s3 = random2D(pUv + vec2(1.0, 1.0));
    float s4 = random2D(pUv + vec2(1.0, 0.0));

    float h1 = mix(s1, s4, tUv.x);
    float h2 = mix(s2, s3, tUv.x);

    return mix(h1, h2, tUv.y);
}

float fractalNoise(vec2 uv, int iterations){
    float total = 0.0;

    for (int i = 0; i < iterations; i++){
        float pwr = pow(2.0, float(i));
        float s = noise(uv * pwr);
        total += s;
    }

    return total / float(iterations);
}

void main(){
    vec2 noiseUVs = v_uv + (noise(v_uv + v_randSeed) * 0.1);
    float circleMask = 0.5 - distance(noiseUVs, vec2(0.5));
    float mask = smoothstep(0.05, 0.07, circleMask);

    float dirtNoise = 1.0 - ((1.0 - fractalNoise(v_uv + v_randSeed, 3)) * 0.5);
    dirtNoise = smoothstep(0.0, 0.9, dirtNoise);

    outColor = vec4(DIRT_COL * dirtNoise, mask);
}