/**
 * Lightweight particle system for catch bursts, floating score text,
 * rising music notes and ambient background bokeh.
 */

import { drawNoteGlyph } from './art';

export type ParticleKind = 'spark' | 'heart' | 'note' | 'ring' | 'text';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  text?: string;
  rot?: number;
  vrot?: number;
}

export class Particles {
  list: Particle[] = [];

  burst(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 90 + Math.random() * 160;
      this.list.push({
        kind: Math.random() < 0.25 ? 'heart' : 'spark',
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 60,
        age: 0,
        life: 0.5 + Math.random() * 0.35,
        size: 4 + Math.random() * 6,
        color,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 6,
      });
    }
    this.list.push({
      kind: 'ring', x, y, vx: 0, vy: 0, age: 0, life: 0.4, size: 10, color,
    });
  }

  musicNote(x: number, y: number, color: string): void {
    this.list.push({
      kind: 'note',
      x: x + (Math.random() - 0.5) * 30,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: -120 - Math.random() * 60,
      age: 0,
      life: 0.9,
      size: 14 + Math.random() * 8,
      color,
      rot: (Math.random() - 0.5) * 0.5,
      vrot: (Math.random() - 0.5) * 2,
    });
  }

  scoreText(x: number, y: number, text: string, color: string): void {
    this.list.push({
      kind: 'text', x, y, vx: 0, vy: -90, age: 0, life: 0.8, size: 22, color, text,
    });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'heart') p.vy += 500 * dt;
      if (p.rot !== undefined && p.vrot !== undefined) p.rot += p.vrot * dt;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = 1 - p.age / p.life;
      g.save();
      g.globalAlpha = Math.min(1, k * 1.6);
      switch (p.kind) {
        case 'spark':
          g.translate(p.x, p.y);
          g.rotate(p.rot ?? 0);
          g.fillStyle = p.color;
          starPath(g, p.size * (0.5 + k * 0.5));
          g.fill();
          break;
        case 'heart':
          g.translate(p.x, p.y);
          g.rotate(p.rot ?? 0);
          g.fillStyle = p.color;
          heartPath(g, p.size * (0.5 + k * 0.5));
          g.fill();
          break;
        case 'note':
          drawNoteGlyph(g, p.x, p.y, p.size, p.color);
          break;
        case 'ring': {
          const r = p.size + (1 - k) * 55;
          g.strokeStyle = p.color;
          g.lineWidth = 3 * k;
          g.beginPath();
          g.arc(p.x, p.y, r, 0, Math.PI * 2);
          g.stroke();
          break;
        }
        case 'text':
          g.font = `800 ${p.size}px 'Baloo 2', 'Arial Rounded MT Bold', system-ui, sans-serif`;
          g.textAlign = 'center';
          g.lineWidth = 4;
          g.strokeStyle = 'rgba(255,255,255,0.9)';
          g.strokeText(p.text ?? '', p.x, p.y);
          g.fillStyle = p.color;
          g.fillText(p.text ?? '', p.x, p.y);
          break;
      }
      g.restore();
    }
  }
}

function starPath(g: CanvasRenderingContext2D, r: number): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
}

function heartPath(g: CanvasRenderingContext2D, s: number): void {
  g.beginPath();
  g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s, -s * 0.35, -s * 0.5, -s, 0, -s * 0.4);
  g.bezierCurveTo(s * 0.5, -s, s, -s * 0.35, 0, s * 0.35);
  g.closePath();
}
