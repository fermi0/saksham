"use client";

import { useEffect, useRef, useState } from "react";

// ─── GLSL ─────────────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying   vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}`;

/**
 * Chroma-key shader for pink / magenta backgrounds.
 *
 * Pipeline:
 *  1. Sample video with chromatic aberration (hologram sharpness)
 *  2. Convert to YCbCr — key on CbCr distance from the background hue
 *  3. Spill suppression — strip residual pink tint from edges
 *  4. Hologram tint (cyan/teal)
 *  5. Scan lines, moving band, fresnel edge glow
 *  6. Bottom projection fade + flicker
 *
 * ── Tuning ──────────────────────────────────────────────────────────────────
 *  u_bg_color   : set to the exact background RGB (sample from your video)
 *  KEY_LO/HI    : chroma-distance thresholds — tighten HI to shrink halo
 *  SPILL_STR    : 0 = no spill removal, 1 = full desaturation of background hue
 */
const FRAG = `
precision highp float;

uniform sampler2D u_tex;
uniform float     u_time;
uniform float     u_flicker;
uniform vec2      u_res;
uniform vec3      u_bg;       // background colour to key out

varying vec2 v_uv;

// ── YCbCr conversion ──────────────────────────────────────────────────────────
vec3 rgb2ycbcr(vec3 c) {
  float Y  =  0.299*c.r + 0.587*c.g + 0.114*c.b;
  float Cb = -0.169*c.r - 0.331*c.g + 0.500*c.b + 0.5;
  float Cr =  0.500*c.r - 0.419*c.g - 0.081*c.b + 0.5;
  return vec3(Y, Cb, Cr);
}

// ── key thresholds (fraction of CbCr range, 0-1) ─────────────────────────────
const float KEY_LO    = 0.09;   // fully transparent below this chroma distance
const float KEY_HI    = 0.28;   // fully opaque above this -- raise if halos remain
const float SPILL_STR = 0.85;   // how aggressively to desaturate the spill colour

// ── hologram CA spread ────────────────────────────────────────────────────────
const float CA = 0.0020;

void main() {
  vec2 uv = v_uv;

  // ── 1. Chromatic aberration sample ─────────────────────────────────────────
  float r = texture2D(u_tex, uv + vec2( CA,      0.0)).r;
  float g = texture2D(u_tex, uv                     ).g;
  float b = texture2D(u_tex, uv - vec2( CA,      0.0)).b;
  g = mix(g, texture2D(u_tex, uv + vec2(0.0, CA*0.5)).g, 0.3);

  vec3 col = clamp(vec3(r, g, b), 0.0, 1.0);

  // ── 2. Chroma key in YCbCr space ───────────────────────────────────────────
  vec3 ycbcr   = rgb2ycbcr(col);
  vec3 bgYcbcr = rgb2ycbcr(u_bg);

  // distance only in Cb/Cr plane -- luma-independent, so lighting variations
  // in the background do not bleed into the key
  float chromaDist = distance(ycbcr.yz, bgYcbcr.yz);
  float alpha = smoothstep(KEY_LO, KEY_HI, chromaDist);

  // ── 3. Spill suppression ────────────────────────────────────────────────────
  // Pixels close to bg hue but not fully keyed get their chroma desaturated
  // so the pink edge bleed is neutralised
  float spill = 1.0 - smoothstep(KEY_HI * 0.5, KEY_HI * 1.4, chromaDist);
  float luma  = ycbcr.x;
  col = mix(col, vec3(luma), spill * SPILL_STR);

  // ── 4. Hologram tint (cyan / teal shift) ───────────────────────────────────
  vec3 holo = vec3(
    col.r * 0.18 + col.g * 0.04,
    col.g * 0.80 + col.b * 0.12 + 0.07,
    col.b * 1.25 + col.g * 0.08 + 0.12
  );
  // Blend bright highlights back toward natural so face/text stay legible
  holo = mix(holo, col * vec3(0.55, 0.92, 1.08),
             smoothstep(0.50, 0.80, luma));

  // gamma push for punchier contrast
  holo = pow(max(holo, vec3(0.0)), vec3(0.84));

  // ── 5a. Fine scan lines ────────────────────────────────────────────────────
  float sl      = sin(uv.y * u_res.y * 3.14159 * 2.8);
  float scanMod = mix(0.76, 1.0, pow(abs(sl), 0.3));

  // ── 5b. Moving bright scan band ────────────────────────────────────────────
  float bandY = mod(u_time * 0.20, 1.25) - 0.1;
  float band  = 1.0 - smoothstep(0.0, 0.055, abs(uv.y - bandY)) * 0.36;

  // ── 5c. Flicker micro-jitter ───────────────────────────────────────────────
  float jitter   = sin(uv.y * 217.3 + u_time * 33.0) * 0.0007;
  jitter        *= (1.0 - u_flicker) * 9.0;
  vec3 jitterCol = texture2D(u_tex, uv + vec2(jitter, 0.0)).rgb;
  holo           = mix(holo, jitterCol * vec3(0.2, 0.9, 1.1), abs(jitter) * 55.0);

  // ── 5d. Edge fresnel glow ──────────────────────────────────────────────────
  float edgeX   = min(uv.x, 1.0 - uv.x);
  float fresnel = 1.0 + (1.0 - smoothstep(0.0, 0.07, edgeX)) * 0.50;

  // ── 5e. Bottom projection fade ─────────────────────────────────────────────
  float bottomFade = smoothstep(0.0, 0.09, uv.y);

  // ── 5f. Additive emission on bright pixels ─────────────────────────────────
  float em   = smoothstep(0.46, 1.0, luma);
  vec3  emit = vec3(0.0, em * 0.20, em * 0.40);

  // ── 6. Compose ─────────────────────────────────────────────────────────────
  vec3  finalCol = (holo + emit) * scanMod * band * fresnel;
  float finalA   = alpha * scanMod * bottomFade * u_flicker;

  gl_FragColor = vec4(finalCol, finalA);
}`;

// ─── WebGL helpers ────────────────────────────────────────────────────────────
function makeShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error("[hologram shader]", gl.getShaderInfoLog(s));
  return s;
}
function makeProgram(gl: WebGLRenderingContext) {
  const p = gl.createProgram()!;
  gl.attachShader(p, makeShader(gl, gl.VERTEX_SHADER,   VERT));
  gl.attachShader(p, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    console.error("[hologram program]", gl.getProgramInfoLog(p));
  return p;
}

// ─── Projection base disc ─────────────────────────────────────────────────────
function ProjectionBase() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2"
      style={{ width: "110%", height: "32px" }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(0,210,255,0.50) 0%, rgba(0,160,255,0.18) 55%, transparent 100%)",
          animation: "projPulse 3.1s ease-in-out infinite",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 0, width: "68%", height: "3px", borderRadius: "50%",
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(100,240,255,0.95) 0%, rgba(0,190,255,0.45) 55%, transparent 100%)",
          boxShadow: "0 0 22px 6px rgba(0,215,255,0.60)",
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * BG_COLOR — the background colour to chroma-key out.
 *
 * HOW TO TUNE: open your video in any image editor, use the colour picker /
 * eye-dropper on a clean patch of background (not near the subject), then
 * convert from 0-255 to 0-1 range.
 *
 * Current value is sampled from the pink/magenta in the screenshot (~#C23070).
 *
 * If the key cuts into the subject:  lower KEY_HI in the shader.
 * If a pink halo remains:            raise KEY_HI slightly.
 * If edges are still pink-tinted:    raise SPILL_STR toward 1.0.
 */
const BG_COLOR: [number, number, number] = [0.76, 0.19, 0.44];

export default function JoiHologram() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!video || !canvas || !wrap) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) { console.error("WebGL not available"); return; }

    const prog = makeProgram(gl);
    gl.useProgram(prog);

    // full-screen quad
    const positions = new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]);
    const uvCoords  = new Float32Array([ 0, 1,  1, 1,   0,0,  1,0]);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvCoords, gl.STATIC_DRAW);
    const aUV = gl.getAttribLocation(prog, "a_uv");
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    // texture
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // uniforms
    const uTex     = gl.getUniformLocation(prog, "u_tex");
    const uTime    = gl.getUniformLocation(prog, "u_time");
    const uFlicker = gl.getUniformLocation(prog, "u_flicker");
    const uRes     = gl.getUniformLocation(prog, "u_res");
    const uBg      = gl.getUniformLocation(prog, "u_bg");

    gl.uniform1i(uTex, 0);
    gl.uniform3f(uBg, ...BG_COLOR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const resize = () => {
      canvas.width  = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    // flicker state
    let flickerVal   = 1.0;
    let flickerTimer = 0.0;
    let nextFlicker  = Math.random() * 4 + 2;
    let inFlicker    = false;
    let flickerPhase = 0.0;

    let rafId = 0;
    let t     = 0.0;
    let last  = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t   += dt;

      flickerTimer += dt;
      if (!inFlicker && flickerTimer >= nextFlicker) {
        inFlicker = true; flickerPhase = 0; flickerTimer = 0;
        nextFlicker = Math.random() * 5 + 2.5;
      }
      if (inFlicker) {
        flickerPhase += dt * 14;
        flickerVal    = 0.52 + Math.abs(Math.sin(flickerPhase * Math.PI)) * 0.48;
        if (flickerPhase > 0.9) { inFlicker = false; flickerVal = 1.0; }
      }

      if (video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }

      gl.uniform1f(uTime,    t);
      gl.uniform1f(uFlicker, flickerVal);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafId = requestAnimationFrame(loop);
    };

    video.muted       = true;
    video.loop        = true;
    video.playsInline = true;

    const onCanPlay = () => {
      video.play().catch(() => {});
      setReady(true);
      resize();
      window.addEventListener("resize", resize);
      rafId = requestAnimationFrame(loop);
    };

    if (video.readyState >= 2) onCanPlay();
    else video.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes projPulse {
          0%,100% { opacity:0.55; transform:scaleX(1); }
          50%      { opacity:0.90; transform:scaleX(1.07); }
        }
        @keyframes hologramRise {
          from { opacity:0; transform:translateY(20px); filter:blur(8px); }
          to   { opacity:1; transform:translateY(0);    filter:blur(0); }
        }
      `}</style>

      <video
        ref={videoRef}
        src="/videos/joi-hologram.webm"
        style={{ display: "none" }}
        playsInline muted loop
      />

      <div
        ref={wrapRef}
        className="pointer-events-none absolute bottom-0 right-0 z-10"
        style={{
          height: "clamp(320px, 58vh, 780px)",
          width:  "clamp(180px, 32vh, 440px)",
          animation: ready
            ? "hologramRise 1.8s cubic-bezier(0.22,1,0.36,1) both"
            : "none",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* projection cone */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          style={{
            height: "100%",
            background:
              "linear-gradient(to top, rgba(0,200,255,0.07) 0%, rgba(0,200,255,0.02) 35%, transparent 100%)",
          }}
        />

      </div>
    </>
  );
}