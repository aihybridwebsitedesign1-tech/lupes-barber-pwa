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
      width: `${height * 0.6}px`,
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
    background: 'linear-gradient(135deg, #f6c453 0%, #d4a017 50%, #b8860b 100%)',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
    ...(isIcon ? {
      width: '100%',
      height: '8px',
      borderRadius: '4px',
    } : {
      width: '30px',
      height: '100%',
      minWidth: '30px',
    }),
  };

  const tubeContainerStyle: React.CSSProperties = {
    position: 'relative',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.1) 100%)',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    ...(isIcon ? {
      flex: 1,
      width: '100%',
      borderRadius: '4px',
    } : {
      flex: 1,
      height: '100%',
    }),
  };

  const stripesStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: isIcon
      ? 'repeating-linear-gradient(45deg, #dc143c 0px, #dc143c 10px, white 10px, white 20px, #003d7a 20px, #003d7a 30px, white 30px, white 40px)'
      : 'repeating-linear-gradient(135deg, #dc143c 0px, #dc143c 15px, white 15px, white 30px, #003d7a 30px, #003d7a 45px, white 45px, white 60px)',
    backgroundSize: isIcon ? '40px 40px' : '60px 60px',
    animation: isIcon ? 'barberPoleRotateVertical 3s linear infinite' : 'barberPoleRotateHorizontal 3s linear infinite',
    opacity: 0.9,
  };

  const glassHighlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: isIcon ? '20%' : '0',
    width: isIcon ? '30%' : '100%',
    height: isIcon ? '100%' : '30%',
    background: isIcon
      ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)'
      : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
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
              background-position: 0 40px;
            }
          }

          @keyframes barberPoleRotateHorizontal {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 60px 0;
            }
          }
        `}
      </style>
      <div style={containerStyle}>
        {isIcon ? (
          <>
            <div style={{ ...capStyle, borderRadius: '4px 4px 0 0' }} />
            <div style={tubeContainerStyle}>
              <div style={stripesStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={{ ...capStyle, borderRadius: '0 0 4px 4px' }} />
          </>
        ) : (
          <>
            <div style={{ ...capStyle, borderRadius: '8px 0 0 8px' }} />
            <div style={tubeContainerStyle}>
              <div style={stripesStyle} />
              <div style={glassHighlightStyle} />
            </div>
            <div style={{ ...capStyle, borderRadius: '0 8px 8px 0' }} />
          </>
        )}
      </div>
    </>
  );
}
