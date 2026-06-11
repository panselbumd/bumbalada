'use client'

import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend,
} from 'chart.js'
import { pctColor } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend)

export default function ExecCharts({ laporanBumd, bumdList }: { laporanBumd: any[]; bumdList: any[] }) {
  const rkapData = bumdList.map(b => {
    const lap = laporanBumd.find(l => l.bumd_id === b.id)
    if (!lap?.target_pendapatan || !lap?.realisasi_pendapatan) return null
    return Math.round(lap.realisasi_pendapatan / lap.target_pendapatan * 100)
  })

  const opiniCounts = {
    WTP:   laporanBumd.filter(l => l.opini_auditor === 'WTP' || l.opini_auditor === 'WTP_DPP').length,
    WDP:   laporanBumd.filter(l => l.opini_auditor === 'WDP').length,
    TMP:   laporanBumd.filter(l => l.opini_auditor === 'TMP').length,
    belum: laporanBumd.filter(l => !l.opini_auditor || l.opini_auditor === 'belum').length,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
      {/* RKAP bar */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px' }}>Capaian RKAP per BUMD</div>
        <div style={{ height: '180px' }}>
          <Bar
            data={{
              labels: bumdList.map(b => b.singkatan ?? b.nama),
              datasets: [{
                label: 'Capaian RKAP (%)',
                data:  rkapData,
                backgroundColor: rkapData.map(v => v == null ? '#e5e7eb' : pctColor(v) + 'CC'),
                borderRadius: 4,
              }],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { min: 0, max: 120, ticks: { callback: (v: any) => v + '%', font: { size: 10 } }, grid: { color: '#f1f5f9' } },
                y: { ticks: { font: { size: 10 } } },
              },
            }}
          />
        </div>
      </div>

      {/* Opini auditor donut */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px' }}>Distribusi Opini Auditor</div>
        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Doughnut
            data={{
              labels: ['WTP', 'WDP', 'TMP', 'Belum'],
              datasets: [{
                data:            [opiniCounts.WTP, opiniCounts.WDP, opiniCounts.TMP, opiniCounts.belum],
                backgroundColor: ['#639922CC', '#BA7517CC', '#A32D2DCC', '#9ca3afCC'],
                borderWidth: 0,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8 } },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
