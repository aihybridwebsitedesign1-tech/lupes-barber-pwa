type BarberPoleProps = {
  variant?: 'icon' | 'banner';
  height?: number;
};

export default function BarberPole({ variant = 'banner', height = 50 }: BarberPoleProps) {
  const isIcon = variant === 'icon';
  const poleHeight = height;
  const capThickness = isIcon ? poleHeight * 0.25 : poleHeight * 1.25;
  const capWidth = isIcon ? poleHeight * 0.36 : poleHeight * 0.96;

  const containerStyle: React.CSSProperties = isIcon
    ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: poleHeight,
        width: capWidth,
      }
    : {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: poleHeight,
        width: '100%',
      };

  const glassStyle: React.CSSProperties = isIcon
    ? {
        position: 'relative',
        flex: 1,
        width: '100%',
        overflow: 'hidden',
        borderRadius: poleHeight,
        boxShadow:
          'inset 0 0 10px rgba(0,0,0,0.4), inset 0 4px 12px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.5)',
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.25) 0%, rgba(255,255,255,0.25) 50%, rgba(0,0,0,0.25) 100%)',
      }
    : {
        position: 'relative',
        flex: 1,
        height: poleHeight * 0.7,
        overflow: 'hidden',
        borderRadius: poleHeight,
        boxShadow:
          'inset 0 0 12px rgba(0,0,0,0.4), inset 0 5px 14px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.35)',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 70%, rgba(0,0,0,0.25) 100%)',
      };

  const stripesStyle: React.CSSProperties = isIcon
    ? {
        position: 'absolute',
        inset: '-30%',
        backgroundImage:
          'repeating-linear-gradient(45deg, #d0002a 0px, #d0002a 12px, white 12px, white 24px, #004080 24px, #004080 36px, white 36px, white 48px)',
        backgroundSize: 'auto',
        animation: 'barberPoleStripesVertical 2.5s linear infinite',
        filter: 'saturate(1.1)',
      }
    : {
        position: 'absolute',
        inset: '-30%',
        backgroundImage:
          'repeating-linear-gradient(135deg, #d0002a 0px, #d0002a 20px, white 20px, white 40px, #004080 40px, #004080 60px, white 60px, white 80px)',
        backgroundSize: 'auto',
        animation: 'barberPoleStripesHorizontal 2.5s linear infinite',
        filter: 'saturate(1.1)',
      };

  const highlightStyle: React.CSSProperties = isIcon
    ? {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '20%',
        width: '15%',
        background:
          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)',
        opacity: 0.7,
        pointerEvents: 'none',
      }
    : {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '18%',
        height: '25%',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
        opacity: 0.8,
        pointerEvents: 'none',
      };

  const innerShadowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
  };

  const capBaseStyle: React.CSSProperties = isIcon
    ? {
        position: 'relative',
        width: capWidth,
        height: capThickness,
        borderRadius: capThickness,
        background:
          'radial-gradient(ellipse at 30% 25%, #fef9e7 0%, #f9e7a5 15%, #e0b64a 35%, #b07b17 65%, #8b6914 85%, #5b3c0f 100%)',
        boxShadow:
          'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(139,105,20,0.55), inset 0 0 0 3px rgba(224,182,74,0.45), 0 3px 8px rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    : {
        position: 'relative',
        width: capWidth,
        height: capThickness,
        borderRadius: capThickness,
        background:
          'radial-gradient(ellipse at 30% 25%, #fef9e7 0%, #f9e7a5 12%, #e0b64a 32%, #b07b17 60%, #8b6914 84%, #4b320b 100%)',
        boxShadow:
          'inset 0 4px 8px rgba(255,255,255,0.7), inset 0 -5px 10px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(139,105,20,0.7), inset 0 0 0 3px rgba(224,182,74,0.5), inset 0 0 0 5px rgba(184,134,11,0.4), 0 6px 16px rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: isIcon ? 0 : '-6px',
        marginRight: isIcon ? 0 : '-6px',
        zIndex: 2,
      };

  const capInnerRing: React.CSSProperties = {
    width: '70%',
    height: '55%',
    borderRadius: 9999,
    border: '1px solid rgba(254,249,231,0.7)',
    boxShadow:
      'inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(115,81,15,0.9)',
    background:
      'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.9) 0%, rgba(240,212,120,0.4) 40%, rgba(133,96,24,0.9) 100%)',
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={capBaseStyle}>
        <div style={capInnerRing} />
      </div>

      <div style={glassStyle}>
        <div style={stripesStyle} />
        <div style={innerShadowStyle} />
        <div style={highlightStyle} />
      </div>

      <div style={capBaseStyle}>
        <div style={capInnerRing} />
      </div>
    </div>
  );
}
