import { ImageResponse } from 'next/og';

export const alt = 'NEXORA — From Learning to Building';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg,#080d12 0%,#111d22 62%,#182516 100%)', color: '#f7f9f5', padding: 80, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#c8fb64', fontSize: 27, letterSpacing: 6, fontWeight: 700 }}><span style={{ width: 28, height: 28, border: '3px solid #c8fb64', borderRadius: 8, transform: 'rotate(45deg)' }} />NEXORA</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44, fontSize: 74, letterSpacing: -4, lineHeight: 1.05, fontWeight: 700, maxWidth: 900 }}><span>From learning</span><span>to building.</span></div>
      <div style={{ marginTop: 32, fontSize: 27, color: '#a1aaa9' }}>The engineering operating system for your next step.</div>
      <div style={{ position: 'absolute', right: -60, bottom: -120, width: 470, height: 470, border: '1px solid rgba(200,251,100,.2)', borderRadius: 999, display: 'flex' }} />
    </div>,
    { ...size },
  );
}
