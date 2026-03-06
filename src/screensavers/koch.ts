import { createShaderToyScreensaver } from './shadertoy';

// Koch Snowflake by Jamesika
// Original: https://www.shadertoy.com/view/Wss3zX
// License: CC BY-NC-SA 3.0

export function createKoch() {
  return createShaderToyScreensaver('Koch', 'Koch snowflake fractal', `
    #define PI 3.141592654

    vec2 ToPolar(vec2 pos)
    {
        float r = length(pos);
        // a (0, 2*PI)
        float a = atan(-pos.y,-pos.x)+PI;
        return vec2(r,a);
    }

    vec2 Rotate(vec2 pos, float angle)
    {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle))*pos;
    }

    // ====================== Drawing Shapes ===========================
    float Circle(vec2 center, vec2 pos, float radius)
    {
        vec2 dir = pos - center;
        return step(dot(dir,dir),pow(radius,2.0));
    }

    float Triangle(vec2 center, vec2 pos, float radius)
    {
        vec2 dir = pos - center;

        return step(
            0.0,
            min(dir.y + radius,
                min(- dir.y + sqrt(3.0)*dir.x+2.0*radius,
                    - dir.y - sqrt(3.0)*dir.x+2.0*radius)));
    }

    float Hexagram(vec2 center, vec2 pos, float radius)
    {
      float t1 = Triangle(center, pos, radius);

        pos = center + Rotate(pos-center,PI);

        float t2 = Triangle(center, pos, radius);
        return max(t1,t2);
    }

    float Skeleton(vec2 center, vec2 pos, float radius)
    {
      vec2 polar = ToPolar(pos - center);

        // vertical skeleton
        float width = 0.13*radius;
        vec2 dir = Rotate(pos-center, floor((polar.y-PI/2.0)/(PI/3.0) + 0.5)*(PI/3.0));
        float ver = mix(0.0,1.0,1.0-clamp(abs(dir.x)/width,0.0,1.0));
        ver = ver - mod(ver,0.25);
        ver *= step(polar.x,radius);

        // horizontal skeleton
        dir.x = abs(dir.x);
        dir = Rotate(dir,-PI/6.0);
        float hor = clamp(dir.y/radius,0.0,1.0);
        hor = fract(hor*4.0);
        hor = 1.0 - abs(hor*2.0 - 1.0);
        hor = hor - mod(hor,0.25);

        return max(ver, hor);
    }

    float DrawShape(vec2 center, vec2 pos, float radius)
    {
        float shapeRatio = sin(iTime*0.7)*0.5+0.5;
        return
          mix(Skeleton(center, pos, radius),
                Hexagram(center, pos, radius),
                shapeRatio);
    }

    // ================================================================

    float Koch(vec2 pos)
    {
        const int n = 4;

        float radius = 100.0;
        vec2 center = vec2(0.0);

        float c = DrawShape(center,pos,radius);

      for(int i = 0;i<n;i++)
        {
            vec2 localPos = pos - center;
            float polarAngle = atan(-localPos.y,-localPos.x) + PI;
            float index = floor(polarAngle/(PI/3.0))+0.5;
            center += (radius*4.0/3.0)*vec2(cos(index*PI/3.0),sin(index*PI/3.0));
            radius /= 3.0;
            c += DrawShape(center,pos,radius);
        }
        return c;
    }

    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        vec2 uv = fragCoord/iResolution.xy;
        vec2 pos = 350.0*(2.0*fragCoord - iResolution.xy)/iResolution.y;

        float t = iTime;
        // rotate & scale
        pos = Rotate(pos,iTime*0.4)*(1.0+0.2*sin(t));
        // alpha
        float c = Koch(pos)*(sin(iTime)*0.2+0.35);

        // color it
        vec3 col =
            vec3(0.1,0.15,0.2)*pow(1.5-length(uv-vec2(0.5)),2.0) +
            vec3(0.4,0.8,0.88)*c;

        fragColor = vec4(col,1.0);
    }
  `);
}
