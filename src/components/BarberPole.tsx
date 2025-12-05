type BarberPoleProps = {
  variant?: 'icon' | 'banner';
  height?: number;
};

export default function BarberPole({ variant = 'icon', height = 50 }: BarberPoleProps) {
  const isIcon = variant === 'icon';

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(isIcon ? {
      width: `${height * 0.36}px`,
      height: `${height}px`,
      flexDirection: 'column',
    } : {
      width: '100%',
      height: `${height}px`,
      flexDirection: 'row',
    }),
  };

  const capStyle: React.CSSProperties = {
    position: 'relative',
    background: 'radial-gradient(ellipse at center, #f9e7a5 0%, #e0b64a 40%, #b07b17 70%, #8b6914 100%)',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.4), 0 3px 8px rgba(0,0,0,0.35)',
    ...(isIcon ? {
      width: '100%',
      height: '10px',
      borderRadius: '9999px',
    } : {
      width: '40px',
      height: '120%',
      minWidth: '40px',
      borderRadius: '9999px',
    }),
  };

  const glassContainerStyle: React.CSSProperties = {
    position: 'relative',
    background: isIcon
      ? 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 70%, rgba(0,0,0,0.15) 100%)'
      : 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 70%, rgba(0,0,0,0.15) 100%)',
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.25), inset 0 -4px 12px rgba(0,0,0,0.25), 0 6px 16px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    borderRadius: '9999px',
    ...(isIcon ? {
      flex: 1,
      width: '100%',
    } : {
      flex: 1,
      height: '100%',
    }),
  };

  const stripesStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: isIcon ? '100%' : '200%',
    height: isIcon ? '200%' : '100%',
    background: isIcon
      ? 'repeating-linear-gradient(45deg, #d0002a 0px, #d0002a 12px, white 12px, white 24px, #004080 24px, #004080 36px, white 36px, white 48px)'
      : 'repeating-linear-gradient(135deg, #d0002a 0px, #d0002a 20px, white 20px, white 40px, #004080 40px, #004080 60px, white 60px, white 80px)',
    animation: isIcon ? 'barberPoleRotateVertical 3s linear infinite' : 'barberPoleRotateHorizontal 3s linear infinite',
  };

  const glassHighlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: isIcon ? '25%' : '0',
    width: isIcon ? '15%' : '100%',
    height: isIcon ? '100%' : '25%',
    background: isIcon
      ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)'
      : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
    pointerEvents: 'none',
  };

  return (
    <>
      <style>
        {`
          @keyframes barberPoleRotateVertical {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(48px);
            }
          }

          @keyframes barberPoleRotateHorizontal {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(80px);
            }
          }
        `}
      </style>
      <div style={containerStyle}>
        {isIcon ? (
          <>
            <div style={{ ...capStyle }} />
            <div style={glassContainerStyle}>
              <div style={stripesStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={{ ...capStyle }} />
          </>
        ) : (
          <>
            <div style={{ ...capStyle }} />
            <div style={glassContainerStyle}>
              <div style={stripesStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={{ ...capStyle }} />
          </>
        )}
      </div>
    </>
  );
}
