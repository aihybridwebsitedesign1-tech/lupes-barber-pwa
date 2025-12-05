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

  const capBaseStyle: React.CSSProperties = {
    position: 'relative',
    background: 'radial-gradient(ellipse at 30% 30%, #fef9e7 0%, #f9e7a5 15%, #e0b64a 35%, #b07b17 60%, #8b6914 85%, #6d5410 100%)',
    boxShadow:
      'inset 0 3px 8px rgba(255,255,255,0.6), ' +
      'inset 0 -3px 8px rgba(0,0,0,0.5), ' +
      'inset 0 0 0 1px rgba(139,105,20,0.4), ' +
      'inset 0 0 0 2px rgba(224,182,74,0.3), ' +
      '0 4px 12px rgba(0,0,0,0.4)',
    ...(isIcon ? {
      width: '100%',
      height: '10px',
      borderRadius: '9999px',
    } : {
      width: '48px',
      height: '130%',
      minWidth: '48px',
      borderRadius: '9999px',
      marginLeft: '-4px',
      marginRight: '-4px',
      zIndex: 2,
    }),
  };

  const capInnerRingStyle: React.CSSProperties = {
    position: 'absolute',
    top: isIcon ? '2px' : '10%',
    left: isIcon ? '2px' : '8px',
    right: isIcon ? '2px' : '8px',
    bottom: isIcon ? '2px' : '10%',
    borderRadius: '9999px',
    border: '1px solid rgba(254,249,231,0.4)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  };

  const glassContainerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '9999px',
    background: isIcon
      ? 'linear-gradient(90deg, rgba(20,20,20,0.2) 0%, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 75%, rgba(20,20,20,0.2) 100%)'
      : 'linear-gradient(180deg, rgba(20,20,20,0.2) 0%, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 75%, rgba(20,20,20,0.2) 100%)',
    boxShadow:
      'inset 0 4px 12px rgba(0,0,0,0.3), ' +
      'inset 0 -4px 12px rgba(0,0,0,0.3), ' +
      '0 6px 20px rgba(0,0,0,0.35)',
    ...(isIcon ? {
      flex: 1,
      width: '100%',
    } : {
      flex: 1,
      height: '100%',
      zIndex: 1,
    }),
  };

  const stripesBackgroundStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isIcon
      ? 'repeating-linear-gradient(45deg, #d0002a 0px, #d0002a 12px, white 12px, white 24px, #004080 24px, #004080 36px, white 36px, white 48px)'
      : 'repeating-linear-gradient(135deg, #d0002a 0px, #d0002a 20px, white 20px, white 40px, #004080 40px, #004080 60px, white 60px, white 80px)',
    animation: isIcon ? 'barberPoleRotateVertical 2.5s linear infinite' : 'barberPoleRotateHorizontal 2.5s linear infinite',
    borderRadius: '9999px',
  };

  const glassHighlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: isIcon ? '28%' : '0',
    width: isIcon ? '18%' : '100%',
    height: isIcon ? '100%' : '28%',
    background: isIcon
      ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)'
      : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
    pointerEvents: 'none',
    borderRadius: '9999px',
  };

  const glassInnerShadowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '9999px',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
  };

  return (
    <>
      <style>
        {`
          @keyframes barberPoleRotateVertical {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 0 48px;
            }
          }

          @keyframes barberPoleRotateHorizontal {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 80px 0;
            }
          }
        `}
      </style>
      <div style={containerStyle}>
        {isIcon ? (
          <>
            <div style={capBaseStyle}>
              <div style={capInnerRingStyle} />
            </div>
            <div style={glassContainerStyle}>
              <div style={stripesBackgroundStyle} />
              <div style={glassInnerShadowStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={capBaseStyle}>
              <div style={capInnerRingStyle} />
            </div>
          </>
        ) : (
          <>
            <div style={capBaseStyle}>
              <div style={capInnerRingStyle} />
            </div>
            <div style={glassContainerStyle}>
              <div style={stripesBackgroundStyle} />
              <div style={glassInnerShadowStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={capBaseStyle}>
              <div style={capInnerRingStyle} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
