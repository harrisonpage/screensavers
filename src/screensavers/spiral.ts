import { createShaderToyScreensaver } from './shadertoy';

// Created by HaleyHalcyon in 2020-02-16
// https://www.shadertoy.com/view/3ttXWX

export function createSpiral() {
  return createShaderToyScreensaver('Spiral', 'Logarithmic spiral pattern', `
float nyan(float theta)
{
    float mimi = min(
        1.0, 2.5 * abs(pow(abs(theta), 0.6) - 0.75) + 0.15
    );
    return 1. + 1. * mimi;
}

float zigzag(float x) {
    return 1. - abs(1. - 2. * fract(x));
}

float fn(float x)
{
    float zig = zigzag(x);
    return smoothstep(0., fwidth(zig), zig - 0.7);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    const float PI = 3.14159265;
    float t = fract(iTime);
    const vec3 color1 = vec3(1.0, 0.5, 0.7);
    const vec3 color2 = vec3(1.0, 0.8, 0.3);

    // Normalized pixel coordinates (from 0 to 1)
    float scale = min(iResolution.x, iResolution.y);
    vec2 uv = fragCoord / scale;
	uv -= vec2(iResolution.x / scale, iResolution.y / scale) / 2.;
    uv *= 2.0;

    float distRaw = uv.x * uv.x + uv.y * uv.y;
    float angle = atan(uv.x, uv.y);
    float distance = log(distRaw);
    float distNyan = log(distRaw * nyan(angle));


    float c1 = fn(distance * 0.3 + t + angle * 1.5 / PI + PI);
    float c2 = fn(distNyan * 1. + t * -2. + PI);

    // Output to screen
    fragColor = vec4(
		c1 * color1[0] + c2 * color2[0],
		c1 * color1[1] + c2 * color2[1],
		c1 * color1[2] + c2 * color2[2],
        1
    );
}
  `);
}
