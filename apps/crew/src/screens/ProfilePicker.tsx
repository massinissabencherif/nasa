import { useNavigate } from 'react-router-dom';
import { useCrewList } from '../lib/hooks';
import { setSelectedCrewId } from '../lib/profile';

export function ProfilePicker() {
  const navigate = useNavigate();
  const crew = useCrewList();

  function choose(id: number) {
    setSelectedCrewId(id);
    navigate('/home');
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 24,
        gap: 18,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>HESTIA</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
          Who's checking in?
        </p>
      </div>
      {crew.length === 0 && (
        <p style={{ color: 'var(--text-faint)', textAlign: 'center' }}>Connecting to the station…</p>
      )}
      {crew.map((member) => (
        <button
          key={member.id}
          onClick={() => choose(member.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 'var(--text-lg)',
              flexShrink: 0,
            }}
          >
            {member.name.split(' ').map((p) => p[0]).join('')}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>{member.name}</p>
            <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
              {member.sex === 'M' ? 'Male' : 'Female'} · {member.age}y
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
