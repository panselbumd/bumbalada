import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'

export default async function ConfigPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'superadmin') redirect('/dashboard')

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Konfigurasi Sistem</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Pengaturan umum SIMBUMD</div>
          </div>
          <button style={{ padding: '7px 14px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-device-floppy" style={{ fontSize: '13px' }} />Simpan Perubahan
          </button>
        </div>

        {/* Pengaturan umum */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
            Pengaturan Umum
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { l:'Nama Aplikasi',            v:'SIMBUMD – Pemerintah Kota Batu', t:'text' },
              { l:'Organisasi',               v:'Pemerintah Kota Batu',           t:'text' },
              { l:'Email Notifikasi Sistem',  v:'simbumd@kotabatu.go.id',         t:'email' },
            ].map(f => (
              <div key={f.l}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>{f.l}</label>
                <input type={f.t} defaultValue={f.v} style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', background: '#fafafa' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Tahun Anggaran Aktif</label>
                <select defaultValue={new Date().getFullYear()} style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', background: '#fafafa' }}>
                  {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Zona Waktu</label>
                <select style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', background: '#fafafa' }}>
                  <option>WIB (UTC+7)</option>
                  <option>WITA (UTC+8)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Kebijakan password */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
            Kebijakan Kata Sandi
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Panjang Minimum</label>
                <input type="number" defaultValue={8} min={6} max={32} style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', background: '#fafafa' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>Masa Berlaku (hari)</label>
                <input type="number" defaultValue={90} min={30} style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', background: '#fafafa' }} />
              </div>
            </div>
            {[
              { l:'Wajib huruf kapital',       checked: true },
              { l:'Wajib angka',               checked: true },
              { l:'Wajib karakter khusus',      checked: false },
              { l:'Tolak 5 sandi terakhir',    checked: true },
            ].map(opt => (
              <div key={opt.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
                <input type="checkbox" defaultChecked={opt.checked} style={{ width: '14px', height: '14px', accentColor: '#1E3A5F' }} />
                {opt.l}
              </div>
            ))}
          </div>
        </div>

        {/* Keamanan sesi */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
            Keamanan Sesi
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { l:'Batas waktu sesi tidak aktif', sub:'Sesi otomatis berakhir setelah idle', type:'select', opts:['30 menit','1 jam','2 jam','8 jam'], val:'1 jam' },
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f9fafb' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>{s.l}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{s.sub}</div>
                </div>
                <select defaultValue={s.val} style={{ fontSize: '11px', padding: '5px 8px', border: '0.5px solid #e5e7eb', borderRadius: '7px', background: '#fff' }}>
                  {s.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {[
              { l:'Verifikasi dua langkah (2FA)', sub:'Wajib bagi Superadmin & Admin', on: true },
              { l:'Login satu perangkat per user', sub:'Sesi lain otomatis dihentikan', on: true },
            ].map(t => (
              <div key={t.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f9fafb' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>{t.l}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{t.sub}</div>
                </div>
                <div style={{
                  width: '32px', height: '18px', borderRadius: '20px', cursor: 'pointer',
                  background: t.on ? '#27AE60' : '#e5e7eb', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', width: '14px', height: '14px',
                    borderRadius: '50%', background: '#fff',
                    right: t.on ? '2px' : undefined, left: t.on ? undefined : '2px',
                    transition: 'all .2s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
