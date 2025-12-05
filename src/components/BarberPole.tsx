export default function BarberPole({ size = 50 }: { size?: number }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size * 1.5}px`,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #333',
        background: 'linear-gradient(45deg, #e74c3c 25%, transparent 25%, transparent 50%, #e74c3c 50%, #e74c3c 75%, transparent 75%, transparent)',
        backgroundSize: '20px 20px',
        animation: 'barberPoleRotate 1s linear infinite',
      }}
    >
      <style>
        {`
          @keyframes barberPoleRotate {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 0 20px;
            }
          }
        `}
      </style>
    </div>
  );
}
