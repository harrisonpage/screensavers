import { createShaderToyScreensaver } from './shadertoy';

// Bokeh by Martijn Steinrucken - 2015
// Based on https://www.shadertoy.com/view/4lXXDB by BigWings
// Original: https://www.shadertoy.com/view/4lXXD2
// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0

export function createBokeh() {
  return createShaderToyScreensaver('Bokeh', 'Twinkling bokeh light particles', `
    // Created by Martijn Steinrucken - 2015
    // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0
    //
    // based on https://www.shadertoy.com/view/4lXXDB by BigWIngs
    const vec3 worldUp = vec3(0.,1.,0.);

    const float pi = 3.141592653589793238;
    const float twopi = 6.283185307179586;

    const float NUM_LIGHTS = 150.;
    const float _FocalDistance = 0.0035;
    const float _DOF = 1.;
    const float _ZOOM = 0.6;

    struct ray {
        vec3 o;
        vec3 d;
    };
    ray e;

    struct camera {
        vec3 p;
        vec3 forward;
        vec3 left;
        vec3 up;

        vec3 lookAt;
        float zoom;
    };
    camera cam;

    float hash( float n )
    {
        return fract(sin(n)*1751.5453);
    }

    vec2 hash2(float n) {
        vec2 n2 = vec2(n, -n+2.1323);
        return fract(sin(n2)*1751.5453);
    }

    float cubicPulse( float c, float w, float x )
    {
        x = abs(x - c);
        if( x>w ) return 0.;
        x /= w;
        return 1. - x*x*(3.-2.*x);
    }

    vec3 rotate_y(vec3 v, float angle)
    {
        float ca = cos(angle); float sa = sin(angle);
        return v*mat3(
            +ca, +.0, -sa,
            +.0,+1.0, +.0,
            +sa, +.0, +ca);
    }

    vec3 rotate_x(vec3 v, float angle)
    {
        float ca = cos(angle); float sa = sin(angle);
        return v*mat3(
            +1.0, +.0, +.0,
            +.0, +ca, -sa,
            +.0, +sa, +ca);
    }

    float PeriodicPulse(float x, float p) {
        return pow((cos(x+sin(x))+1.)/2., p);
    }

    vec3 ClosestPoint(ray r, vec3 p) {
        return r.o + max(1., dot(p-r.o, r.d))*r.d;
    }

    float hash3( float n )
    {
        return fract(sin(n)*753.5453123);
    }

    float vnoise( in vec3 x )
    {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);

        float n = p.x + p.y*157.0 + 113.0*p.z;
        return mix(mix(mix( hash3(n+  0.0), hash3(n+  1.0),f.x),
                       mix( hash3(n+157.0), hash3(n+158.0),f.x),f.y),
                   mix(mix( hash3(n+113.0), hash3(n+114.0),f.x),
                       mix( hash3(n+270.0), hash3(n+271.0),f.x),f.y),f.z);
    }

    float Bokeh(ray r, vec3 p)
    {
        float dist = length( p-ClosestPoint(r, p) );

        float distFromCam = length(p-e.o);
        float focus = cubicPulse(_FocalDistance, _DOF, distFromCam);

        vec3 inFocus = vec3(0.2, -0.1, 1.);
        vec3 outFocus = vec3(0.25, 0.2, .05);

        vec3 thisFocus = mix(outFocus, inFocus, focus);

        return smoothstep(thisFocus.x, thisFocus.y, dist)*thisFocus.z;
    }

    vec3 Lights(ray r, float t) {

        vec3 col = vec3(0.);

        float height = 4.;
        float halfHeight = height/2.;

        for(float i=0.; i<NUM_LIGHTS; i++) {
            float c = i/NUM_LIGHTS;
            c *= twopi;

            vec2 xy = hash2(i)*10.-5.;

            float y = fract(c)*height-halfHeight;

            vec3 pos = vec3(xy.x, y, xy.y);
            pos += vec3(vnoise(i * pos * iTime * 0.0006), vnoise(i * pos * iTime * 0.0002), 0.0);

            float glitter = 1. +clamp((sin(c+t*3.)-0.9)*50., 0., 100.);

            col += Bokeh(r, pos)*glitter *mix( vec3(02.5,2.2,01.9), vec3(0.7, 1.6,3.0), 0.5+0.5*sin(float(i)*1.2+1.9));
        }
        return col;
    }


    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        vec2 uv = (fragCoord.xy / iResolution.xy) - 0.5;
        uv.y *= iResolution.y/iResolution.x;
        float t = iTime;

        float speed = 0.004;

        float st = sin(t*speed);
        float ct = cos(t*speed);

        cam.p = vec3(st, st, ct)*vec3(4., 3.5, 4.);
        cam.p = normalize(cam.p);

        // Autonomous camera drift replacing mouse interaction
        float mx = sin(iTime * 0.05) * 0.3;
        float my = cos(iTime * 0.07) * 0.15;
        cam.p = rotate_x(cam.p, my*2.+5.2);
        cam.p = rotate_y(cam.p, mx*3.);

        cam.lookAt = vec3(0., 0., 0.);
        cam.forward = normalize(cam.lookAt-cam.p);
        cam.left = cross(worldUp, cam.forward);
        cam.up = cross(cam.forward, cam.left);
        cam.zoom = _ZOOM;

        vec3 screenCenter = cam.p+cam.forward*cam.zoom;
        vec3 screenPoint = screenCenter+cam.left*uv.x+cam.up*uv.y;

        e.o = cam.p;
        e.d = normalize(screenPoint-cam.p);

        vec3 col = vec3(0.);

        col += Lights(e, t*0.2);
        col += 0.05;
        fragColor = vec4(col.r, col.g, col.b, 1.);
    }
  `);
}
