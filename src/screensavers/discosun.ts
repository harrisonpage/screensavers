import { createShaderToyScreensaver } from './shadertoy';

// SPDX-License-Identifier: CC-BY-NC-SA-4.0
// Copyright (c) 2026 @WorkingClassHacker
// Based on Abstract Shine by @Frostbyte
// License: CC-BY-NC-SA-4.0
// https://creativecommons.org/licenses/by-nc-sa/4.0/

export function createDiscoSun() {
  return createShaderToyScreensaver('DiscoSun', 'Volumetric tunnel with disco palette', `
    // SPDX-License-Identifier: CC-BY-NC-SA-4.0
    // Copyright (c) 2026 @WorkingClassHacker
    //[LICENSE] https://creativecommons.org/licenses/by-nc-sa/4.0/

    // SPDX-License-Identifier: CC-BY-NC-SA-4.0
    // Based on Abstract Shine by @Frostbyte
    // Copyright (c) 2026 @Frostbyte

    // Rotation matrix using cosine phase offsets.
    // cos(a+33) ~ -sin(a)
    // cos(a+11) ~  sin(a)
    // compact 2D rotation without sin().
    // Approximates sin within an invisible margin for animated graphics

    #define R(a) mat2(cos(a+vec4(0, 33, 11, 0)))

    // IQ's continuous cosine palette (MIT)
    // produces smooth, periodic color gradients
    // https://www.shadertoy.com/view/ll2GD3

    vec3 palette(float i){
        const vec3 a = vec3(0.50, 0.38, 0.26);  // base tone (warm midtone)
        const vec3 b = vec3(0.50, 0.35, 0.25);  // amplitude (vibrance)
        const vec3 c = vec3(1.00);              // frequency (cyclic complexity)
        const vec3 d = vec3(0.00, 0.12, 0.25);  // phase offsets (hue shift)
        return a + b * cos(6.2831853 * (c * i + d));
    }

    vec3 palette2(float i){
        const vec3 a = vec3(0.742702, 0.908877, 0.959831);
        const vec3 b = vec3(-0.711000, 0.275000, -0.052000);
        const vec3 c = vec3(1.000000, 1.855000, 1.000000);
        const vec3 d = vec3(0.180000, 0.091000, 0.380000);
        return a + b * cos(6.2831853 * (c * i + d));
    }

    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        // pixel coordinate
        vec2 u = fragCoord.xy;

        // normalized screen space centered at origin
        vec2 uv = (u - 0.5*iResolution.xy + 0.5) / iResolution.y;

        float i, s;
        float t = iTime;

        vec3 p;

        // ray direction through pixel (camera ray)
        vec3 d = normalize(vec3(
            2.0 * u - iResolution.xy,
            iResolution.y
        ));

        // starting depth -> creates forward motion
        p.z = t;

        // raymarch loop
        fragColor *= 0.0;
        for (float j = 0.0; j < 20.0; j++)
        {
            // depth-dependent rotation
            // produces corkscrew tunnel motion
            p.xy *= R(-p.z * 0.01 - iTime * 0.05);

            // base step size
            s = 0.6;

            // cylindrical confinement
            // creates tunnel boundary at radius ~ 10
            s = max(s, 4.0 * (-length(p.xy) + 10.0));

            // organic deformation field
            // adds flow & energy patterns
            s += abs(
                p.y * 0.004 +                // slight tilt
                sin(t - p.x * 0.5) * 0.9 +  // traveling wave
                1.0                          // baseline thickness
            );

            // march ray forward
            p += d * s;

            // volumetric glow accumulation
            fragColor += 1.0 / (s * 0.2);
        }

        // apply palette based on final ray distance
        fragColor *= vec4(palette(length(p)/(abs(sin(iTime*0.02)*50.)+6.0)), 1.0);

        // time-gated screen-space shimmer / interference layer
        fragColor -= 20.0 *
            smoothstep(
                .001,
                abs(sin(iTime*5.0)),
                .7 - length(sin(uv*200.0)/1.5)-abs(uv.y)+.2
            );

        // brightness normalization
        fragColor /= 0.5e2;

        // radial gradient
        float l = length(uv);

        // vignette
        fragColor *= 1.2-l;

        // center glow
        fragColor = mix(fragColor, palette(l-.23).rgbr, 1.0-smoothstep(.01,.95,l));

        // soft highlight compression (tanh polyfill for WebGL1)
        vec4 e2 = exp(2.0 * (fragColor+fragColor));
        fragColor = (e2 - 1.0) / (e2 + 1.0);
    }
  `);
}
