"use client"

const COLUMNS = [
  { title: "Platform", links: ["Clinical", "Operations", "Finance", "Support services"] },
  { title: "Intelligence", links: ["AI radiology triage", "Critical-result SLA", "Predictive operations", "Ops assistant"] },
  { title: "Trust", links: ["Security", "NABH readiness", "DISHA / DPDP", "AI governance"] },
]

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[#EAECF2]">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center">
              <img src="/Agentix logo-health.svg" alt="Agentix HIMS" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-[13px] text-[#667085] mt-4 max-w-xs leading-relaxed">
              The AI-native operating system for modern hospitals, networks and academic medical centers.
            </p>
          </div>
          {COLUMNS.map(col => (
            <div key={col.title}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#98A2B3]">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(l => (
                  <li key={l}><span className="text-[13px] text-[#475467] hover:text-[#101828] transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-[#EAECF2] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#98A2B3]">© 2026 Agentix HIMS Group. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[12px] font-medium text-[#667085]">
            <span className="cursor-pointer hover:text-[#101828]">Privacy</span>
            <span className="cursor-pointer hover:text-[#101828]">Terms</span>
            <span className="cursor-pointer hover:text-[#101828]">DPDP</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
